import Foundation
import Supabase

@MainActor
@Observable
final class AppStore {
    var authRoute: AuthRoute = .welcome
    var isAuthenticated = false
    var isBooting = true
    var currentUser: Player?
    var users: [Player] = []
    var sessions: [Session] = []
    var pastSessions: [Session] = []
    var groups: [PlayerGroup] = []
    var selectedTab: AppTab = .sessions
    /// Pushed full-screen pages bump this so the floating tab bar steps aside.
    var tabBarHiddenCount = 0
    var toast: Toast?
    var fetchError: String?
    var isSyncing = false
    var connectionStatus = "disconnected"
    var lastFetch: Date = .distantPast
    var newTierName: String?

    let network = NetworkMonitor()

    var activeUser: Player? {
        guard let currentUser else { return nil }
        return users.first(where: { $0.id == currentUser.id }) ?? currentUser
    }

    var upcomingSessions: [Session] {
        sessions
            .filter { SessionLifecycle.isUpcoming($0) }
            .sorted { $0.startTime < $1.startTime }
    }

    var recentSessions: [Session] {
        let combined = uniqueSessions(sessions + pastSessions)
        return combined
            .filter { session in
                session.finalBill != nil || (ISO.date(from: session.endTime) ?? .distantFuture) < .now
            }
            .sorted { $0.endTime > $1.endTime }
            .prefix(3)
            .map { $0 }
    }

    func player(_ id: String) -> Player? {
        users.first(where: { $0.id == id })
    }

    func session(id: String) -> Session? {
        sessions.first(where: { $0.id == id }) ?? pastSessions.first(where: { $0.id == id })
    }

    private let realtime = RealtimeService()
    private var mutatingKeys = Set<String>()
    private var fetchGeneration = 0
    private var toastTask: Task<Void, Never>?
    private var didStartAuth = false

    func start() {
        guard !didStartAuth else { return }
        didStartAuth = true
        wireRealtime()
        Task { await observeAuth() }
    }

    func handleSceneActive() {
        guard isAuthenticated else { return }
        Task {
            await fetchData()
            await realtime.start()
        }
    }

    // MARK: - Auth

    func login(username: String, password: String) async throws {
        let email = AuthIdentity.email(from: username.trimmingCharacters(in: .whitespaces))
        try await SmashXClient.shared.auth.signIn(email: email, password: password)
    }

    func isUsernameAvailable(_ name: String) async throws -> Bool {
        let trimmed = name.trimmingCharacters(in: .whitespaces)
        struct Row: Decodable { let id: String }
        let rows: [Row] = try await SmashXClient.shared
            .from("profiles")
            .select("id")
            .ilike("name", value: trimmed)
            .execute()
            .value
        return rows.isEmpty
    }

    func register(username: String, password: String, avatarURL: String) async throws {
        let name = username.trimmingCharacters(in: .whitespaces)
        try await SmashXClient.shared.auth.signUp(
            email: AuthIdentity.email(from: name),
            password: password,
            data: [
                "name": .string(name),
                "avatar": .string(avatarURL)
            ]
        )
    }

    func logout() async {
        await realtime.stop()
        try? await SmashXClient.shared.auth.signOut()
    }

    func deleteAccount() async {
        do {
            try await SmashXClient.shared.rpc("delete_user").execute()
            await logout()
        } catch {
            showToast("Could not delete account", isError: true)
        }
    }

    // MARK: - Data

    func fetchData() async {
        let generation = incrementFetch()
        let started = Date()
        do {
            let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: .now) ?? .now
            async let profiles: [ProfileRow] = SmashXClient.shared.from("profiles").select().execute().value
            async let active: [SessionRow] = SmashXClient.shared
                .from("sessions")
                .select()
                .gte("end_time", value: ISO.string(from: yesterday))
                .order("start_time", ascending: true)
                .execute()
                .value
            async let recent: [SessionRow] = SmashXClient.shared
                .from("sessions")
                .select()
                .lt("end_time", value: ISO.string(from: .now))
                .order("end_time", ascending: false)
                .limit(3)
                .execute()
                .value

            let (profileRows, activeRows, recentRows) = try await (profiles, active, recent)
            guard generation == fetchGeneration else { return }

            users = profileRows.map(Mappers.player)
            sessions = activeRows.map(Mappers.session)
            pastSessions = recentRows.map(Mappers.session)
            lastFetch = started
            fetchError = nil
            isBooting = false
            if let userId = currentUser?.id { Task { await fetchGroups(userId: userId) } }
        } catch {
            if sessions.isEmpty {
                fetchError = error.localizedDescription
            }
            isBooting = false
        }
    }

    // MARK: - Groups

    func fetchGroups(userId: String? = nil) async {
        guard userId != nil || currentUser != nil else { return }
        do {
            let rows: [GroupRow] = try await SmashXClient.shared.rpc("get_my_player_groups").execute().value
            groups = rows.map { PlayerGroup(id: $0.id, name: $0.name, ownerId: $0.ownerId, memberIds: $0.memberIds ?? []) }
        } catch {
            // Fall back to direct table reads if the RPC is unavailable.
            do {
                let me = userId ?? currentUser?.id ?? ""
                let mine: [GroupMemberRow] = try await SmashXClient.shared.from("group_members")
                    .select("group_id, user_id").eq("user_id", value: me).execute().value
                let ids = Array(Set(mine.map(\.groupId)))
                guard !ids.isEmpty else { groups = []; return }
                async let g: [GroupTableRow] = SmashXClient.shared.from("player_groups").select().in("id", values: ids).execute().value
                async let m: [GroupMemberRow] = SmashXClient.shared.from("group_members").select("group_id, user_id").in("group_id", values: ids).execute().value
                let (groupRows, memberRows) = try await (g, m)
                groups = groupRows.map { row in
                    PlayerGroup(id: row.id, name: row.name, ownerId: row.ownerId,
                                memberIds: memberRows.filter { $0.groupId == row.id }.map(\.userId))
                }
            } catch {
                showToast("Couldn’t load groups", isError: true)
            }
        }
    }

    func createGroup(name: String, memberIds: [String]) async -> Bool {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return false }
        do {
            let groupId: String = try await SmashXClient.shared
                .rpc("create_player_group", params: ["p_name": trimmed]).execute().value
            var failed = 0
            for id in Set(memberIds) {
                do {
                    try await SmashXClient.shared
                        .rpc("add_group_member", params: ["p_group_id": groupId, "p_user_id": id]).execute()
                } catch { failed += 1 }
            }
            await fetchGroups()
            showToast(failed > 0 ? "Group created, but some members could not be added" : "Group created", isError: failed > 0)
            return true
        } catch {
            showToast("Failed to create group", isError: true)
            return false
        }
    }

    func addGroupMembers(groupId: String, userIds: [String]) async {
        for id in userIds {
            do {
                try await SmashXClient.shared
                    .rpc("add_group_member", params: ["p_group_id": groupId, "p_user_id": id]).execute()
            } catch {
                showToast("Failed to add member", isError: true)
            }
        }
        await fetchGroups()
    }

    func removeGroupMember(groupId: String, userId: String) async {
        do {
            try await SmashXClient.shared
                .rpc("remove_group_member", params: ["p_group_id": groupId, "p_user_id": userId]).execute()
            await fetchGroups()
        } catch {
            showToast("Failed to remove member", isError: true)
        }
    }

    func renameGroup(groupId: String, name: String) async {
        let trimmed = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        let previous = groups
        groups = groups.map { $0.id == groupId ? PlayerGroup(id: $0.id, name: trimmed, ownerId: $0.ownerId, memberIds: $0.memberIds) : $0 }
        do {
            try await SmashXClient.shared
                .rpc("rename_player_group", params: ["p_group_id": groupId, "p_name": trimmed]).execute()
            showToast("Group renamed")
        } catch {
            groups = previous
            showToast("Failed to rename group", isError: true)
        }
    }

    func deleteGroup(_ groupId: String) async {
        do {
            try await SmashXClient.shared
                .rpc("delete_player_group", params: ["p_group_id": groupId]).execute()
            await fetchGroups()
            showToast("Group deleted")
        } catch {
            showToast("Failed to delete group", isError: true)
        }
    }

    func refresh() async {
        await fetchData()
    }

    func fetchSession(id: String) async -> Session? {
        if let existing = session(id: id) { return existing }
        do {
            let row: SessionRow = try await SmashXClient.shared
                .from("sessions")
                .select()
                .eq("id", value: id)
                .single()
                .execute()
                .value
            let mapped = Mappers.session(from: row)
            pastSessions.append(mapped)
            return mapped
        } catch {
            return nil
        }
    }

    func fetchSessions(containing playerId: String) async -> [Session] {
        do {
            let rows: [SessionRow] = try await SmashXClient.shared
                .from("sessions")
                .select()
                .contains("player_ids", value: [playerId])
                .execute()
                .value
            return rows.map(Mappers.session)
        } catch {
            return sessions.filter { $0.playerIds.contains(playerId) }
        }
    }

    func fetchSessions(inMonth date: Date) async -> [Session] {
        let calendar = Calendar.current
        let start = calendar.date(from: calendar.dateComponents([.year, .month], from: date)) ?? date
        let end = calendar.date(byAdding: DateComponents(month: 1, second: -1), to: start) ?? date
        do {
            let rows: [SessionRow] = try await SmashXClient.shared
                .from("sessions")
                .select()
                .gte("start_time", value: ISO.string(from: start))
                .lte("start_time", value: ISO.string(from: end))
                .execute()
                .value
            return rows.map(Mappers.session)
        } catch {
            return []
        }
    }

    // MARK: - Sessions

    func saveSession(_ draft: CreateSessionDraft, editing: Session?) async -> String? {
        guard let user = activeUser else { return "Login required." }
        Haptics.play(.medium)
        var end = draft.end
        if end < draft.start {
            end = Calendar.current.date(byAdding: .day, value: 1, to: end) ?? end
        }
        let startISO = ISO.string(from: draft.start)
        let endISO = ISO.string(from: end)
        let courts = max(1, draft.courtCount)

        if let editing {
            let snapshot = sessions
            upsertSession(editing.updating(
                title: draft.title,
                location: draft.location,
                startTime: startISO,
                endTime: endISO,
                courtCount: courts
            ))
            do {
                try await SmashXClient.shared.from("sessions").update([
                    "title": AnyJSON.string(draft.title),
                    "location": AnyJSON.string(draft.location),
                    "start_time": AnyJSON.string(startISO),
                    "end_time": AnyJSON.string(endISO),
                    "court_count": AnyJSON.integer(courts),
                    "max_players": AnyJSON.integer(SessionLifecycle.maxPlayers(courtCount: courts))
                ] as [String: AnyJSON]).eq("id", value: editing.id).execute()
                showToast("Session updated")
                return nil
            } catch {
                sessions = snapshot
                return error.localizedDescription
            }
        }

        do {
            let inserted: SessionRow = try await SmashXClient.shared
                .from("sessions")
                .insert(SessionInsert(
                    title: draft.title,
                    location: draft.location,
                    startTime: startISO,
                    endTime: endISO,
                    courtCount: courts,
                    maxPlayers: SessionLifecycle.maxPlayers(courtCount: courts),
                    hostId: user.id,
                    playerIds: [user.id]
                ))
                .select()
                .single()
                .execute()
                .value
            upsertSession(Mappers.session(from: inserted))
            showToast("Session created")
            return nil
        } catch {
            return error.localizedDescription
        }
    }

    func join(_ sessionId: String) async {
        guard let user = activeUser, let session = session(id: sessionId) else { return }
        guard !session.playerIds.contains(user.id) else { return }
        let key = "join-\(sessionId)"
        guard lock(key) else { return }
        defer { unlock(key) }
        Haptics.play(.light)
        let snapshot = sessions
        upsertSession(session.updating(playerIds: session.playerIds + [user.id]))
        do {
            try await SmashXClient.shared.from("sessions").update([
                "player_ids": AnyJSON.array((session.playerIds + [user.id]).map(AnyJSON.string))
            ] as [String: AnyJSON]).eq("id", value: sessionId).execute()
        } catch {
            sessions = snapshot
            showToast("Failed to join", isError: true)
        }
    }

    func leave(_ sessionId: String) async {
        guard let user = activeUser, let session = session(id: sessionId) else { return }
        let snapshot = sessions
        let remaining = session.playerIds.filter { $0 != user.id }
        upsertSession(session.updating(playerIds: remaining))
        do {
            try await SmashXClient.shared.from("sessions").update([
                "player_ids": AnyJSON.array(remaining.map(AnyJSON.string))
            ] as [String: AnyJSON]).eq("id", value: sessionId).execute()
        } catch {
            sessions = snapshot
            showToast("Failed to leave", isError: true)
        }
    }

    func deleteSession(_ sessionId: String) async {
        let snapshot = sessions
        sessions.removeAll { $0.id == sessionId }
        do {
            try await SmashXClient.shared.from("sessions").delete().eq("id", value: sessionId).execute()
            showToast("Session deleted")
        } catch {
            sessions = snapshot
            showToast("Delete failed", isError: true)
        }
    }

    func startSession(_ sessionId: String) async {
        guard let session = session(id: sessionId) else { return }
        let snapshot = sessions
        let now = ISO.string(from: .now)
        var times: [String: String] = [:]
        for id in session.playerIds { times[id] = now }
        upsertSession(session.updating(started: true, checkedInPlayerIds: session.playerIds, checkInTimes: times))
        do {
            try await SmashXClient.shared.from("sessions").update([
                "checked_in_player_ids": AnyJSON.array(session.playerIds.map(AnyJSON.string)),
                "check_in_times": AnyJSON.object(times.mapValues(AnyJSON.string))
            ] as [String: AnyJSON]).eq("id", value: sessionId).execute()
            showToast("Session started")
        } catch {
            sessions = snapshot
            showToast("Failed to start", isError: true)
        }
    }

    func endSession(_ sessionId: String) async {
        guard let session = session(id: sessionId) else { return }
        let snapshot = sessions
        let bill = FinalBill(
            totalCourtPrice: 0,
            totalShuttlePrice: 0,
            shuttlesUsed: 0,
            pricePerShuttle: 0,
            totalCost: 0,
            splitMode: "EQUAL",
            items: session.checkedInPlayerIds.map { BillItem(userId: $0, durationMinutes: 0, amount: 0) }
        )
        upsertSession(session.updating(finalBill: bill))
        do {
            try await SmashXClient.shared.from("sessions").update([
                "final_bill": try encodeJSON(bill)
            ] as [String: AnyJSON]).eq("id", value: sessionId).execute()
            showToast("Session ended")
        } catch {
            sessions = snapshot
            showToast("Failed to end session", isError: true)
        }
    }

    func toggleCheckIn(sessionId: String, playerId: String) async {
        let key = "checkin-\(sessionId)-\(playerId)"
        guard lock(key), let session = session(id: sessionId) else { return }
        defer { unlock(key) }
        let snapshot = sessions
        var checked = session.checkedInPlayerIds
        var times = session.checkInTimes
        if checked.contains(playerId) {
            checked.removeAll { $0 == playerId }
            times.removeValue(forKey: playerId)
        } else {
            checked.append(playerId)
            times[playerId] = ISO.string(from: .now)
        }
        upsertSession(session.updating(started: session.started || !checked.isEmpty, checkedInPlayerIds: checked, checkInTimes: times))
        do {
            try await SmashXClient.shared.from("sessions").update([
                "checked_in_player_ids": AnyJSON.array(checked.map(AnyJSON.string)),
                "check_in_times": AnyJSON.object(times.mapValues(AnyJSON.string))
            ] as [String: AnyJSON]).eq("id", value: sessionId).execute()
        } catch {
            sessions = snapshot
            showToast("Update failed", isError: true)
        }
    }

    func assignCourt(sessionId: String, courtIndex: Int, playerIds: [String]) async {
        guard let session = session(id: sessionId) else { return }
        let snapshot = sessions
        var assignments = session.courtAssignments
        var starts = session.matchStartTimes
        let key = String(courtIndex)
        if playerIds.isEmpty {
            assignments.removeValue(forKey: key)
            starts.removeValue(forKey: key)
        } else {
            assignments[key] = playerIds
            starts[key] = ISO.string(from: .now)
        }
        upsertSession(session.updating(courtAssignments: assignments, matchStartTimes: starts))
        do {
            try await SmashXClient.shared.from("sessions").update([
                "court_assignments": AnyJSON.object(assignments.mapValues { AnyJSON.array($0.map(AnyJSON.string)) }),
                "match_start_times": AnyJSON.object(starts.mapValues(AnyJSON.string))
            ] as [String: AnyJSON]).eq("id", value: sessionId).execute()
        } catch {
            sessions = snapshot
            showToast("Assignment failed", isError: true)
        }
    }

    func addCourt(_ sessionId: String) async {
        guard let session = session(id: sessionId) else { return }
        let snapshot = sessions
        let count = session.courtCount + 1
        upsertSession(session.updating(courtCount: count))
        do {
            try await SmashXClient.shared.from("sessions").update([
                "court_count": AnyJSON.integer(count),
                "max_players": AnyJSON.integer(SessionLifecycle.maxPlayers(courtCount: count))
            ] as [String: AnyJSON]).eq("id", value: sessionId).execute()
            showToast("Court \(count) added")
        } catch {
            sessions = snapshot
            showToast("Failed to add court", isError: true)
        }
    }

    func recordMatch(sessionId: String, courtIndex: Int, winningTeamIndex: Int) async {
        let key = "match-\(sessionId)-\(courtIndex)"
        guard lock(key), let session = session(id: sessionId), let user = activeUser else { return }
        defer { unlock(key) }

        let assigned = session.courtAssignments[String(courtIndex)] ?? []
        guard !assigned.isEmpty else { return }
        let mid = Int(ceil(Double(assigned.count) / 2))
        let team1 = Array(assigned.prefix(mid))
        let team2 = Array(assigned.suffix(from: mid))
        let now = ISO.string(from: .now)
        let matchId = String(UUID().uuidString.prefix(8)).lowercased()
        let preview = Elo.computeDeltas(team1Ids: team1, team2Ids: team2, winningTeamIndex: winningTeamIndex, players: users)
        let previousPoints = user.points

        let snapshotSessions = sessions
        let snapshotUsers = users
        let match = MatchResult(
            id: matchId,
            timestamp: now,
            team1Ids: team1,
            team2Ids: team2,
            winningTeamIndex: winningTeamIndex,
            pointsChange: 0,
            eloChanges: preview
        )
        var assignments = session.courtAssignments
        var starts = session.matchStartTimes
        var times = session.checkInTimes
        assignments.removeValue(forKey: String(courtIndex))
        starts.removeValue(forKey: String(courtIndex))
        assigned.forEach { times[$0] = now }
        upsertSession(session.updating(
            checkInTimes: times,
            courtAssignments: assignments,
            matchStartTimes: starts,
            matches: session.matches + [match]
        ))
        users = users.map { player in
            guard let delta = preview[player.id] else { return player }
            return player.updating(points: player.points + delta)
        }

        isSyncing = true
        do {
            let response: RecordMatchResponse = try await SmashXClient.shared
                .rpc("record_match_result", params: RecordMatchParams(
                    pSessionId: sessionId,
                    pMatchId: matchId,
                    pCourtIndex: courtIndex,
                    pTeam1Ids: team1,
                    pTeam2Ids: team2,
                    pWinningTeamIndex: winningTeamIndex,
                    pNow: now
                ))
                .execute()
                .value
            incrementFetch()
            try await refreshProfiles()
            if let next = activeUser {
                let before = Set(unlockedRankFrames(previousPoints))
                let after = unlockedRankFrames(next.points)
                if let unlocked = after.first(where: { !before.contains($0) }) {
                    newTierName = RankTier(rawValue: unlocked)?.displayName ?? unlocked
                }
            }
            _ = response
            Haptics.play(.success)
            showToast("Match recorded")
        } catch {
            sessions = snapshotSessions
            users = snapshotUsers
            Haptics.play(.error)
            showToast("Failed to save match. Pull to refresh.", isError: true)
        }
        isSyncing = false
    }

    func undoMatch(sessionId: String, matchId: String) async {
        let key = "undo-\(sessionId)-\(matchId)"
        guard lock(key), let session = session(id: sessionId),
              let match = session.matches.first(where: { $0.id == matchId }) else { return }
        defer { unlock(key) }

        let snapshotSessions = sessions
        let snapshotUsers = users
        upsertSession(session.updating(matches: session.matches.filter { $0.id != matchId }))
        users = users.map { player in
            let delta = match.eloChanges?[player.id]
            if match.winners().contains(player.id) {
                return player.updating(points: player.points - (delta ?? match.pointsChange), wins: max(player.wins - 1, 0))
            }
            if match.losers().contains(player.id) {
                return player.updating(points: player.points - (delta ?? -match.pointsChange), losses: max(player.losses - 1, 0))
            }
            return player
        }

        isSyncing = true
        do {
            try await SmashXClient.shared.rpc("undo_match_result", params: UndoMatchParams(
                pSessionId: sessionId,
                pMatchId: matchId,
                pTeam1Ids: match.team1Ids,
                pTeam2Ids: match.team2Ids,
                pWinningTeamIndex: match.winningTeamIndex,
                pPointsChange: match.pointsChange
            )).execute()
            incrementFetch()
            try await refreshProfiles()
            Haptics.play(.success)
            showToast("Match undone")
        } catch {
            sessions = snapshotSessions
            users = snapshotUsers
            Haptics.play(.error)
            showToast("Failed to undo match", isError: true)
        }
        isSyncing = false
    }

    func updateProfile(_ player: Player) async {
        let snapshotUsers = users
        let snapshotCurrent = currentUser
        users = users.map { $0.id == player.id ? player : $0 }
        currentUser = player
        do {
            try await SmashXClient.shared.from("profiles").update([
                "name": AnyJSON.string(player.name),
                "avatar": AnyJSON.string(player.avatar),
                "rank_frame": AnyJSON.string(player.rankFrame),
                "special_frame": player.specialFrame.map(AnyJSON.string) ?? AnyJSON.null
            ] as [String: AnyJSON]).eq("id", value: player.id).execute()
            showToast("Profile saved")
        } catch {
            users = snapshotUsers
            currentUser = snapshotCurrent
            showToast("Could not save profile", isError: true)
        }
    }

    func showToast(_ message: String, isError: Bool = false) {
        toastTask?.cancel()
        toast = Toast(message: message, isError: isError)
        toastTask = Task {
            try? await Task.sleep(for: .seconds(3))
            if !Task.isCancelled { toast = nil }
        }
    }

    // MARK: - Private

    private func observeAuth() async {
        for await state in SmashXClient.shared.auth.authStateChanges {
            switch state.event {
            case .initialSession, .signedIn:
                if let session = state.session {
                    await becomeAuthenticated(userId: session.user.id.uuidString.lowercased(), metadata: session.user.userMetadata)
                } else {
                    isBooting = false
                    isAuthenticated = false
                }
            case .signedOut:
                resetLocalState()
            default:
                break
            }
        }
    }

    private func becomeAuthenticated(userId: String, metadata: [String: AnyJSON]) async {
        isAuthenticated = true
        authRoute = .welcome
        selectedTab = .sessions
        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.loadProfile(userId: userId, metadata: metadata) }
            group.addTask { await self.fetchData() }
        }
        await realtime.start()
        isBooting = false
    }

    private func loadProfile(userId: String, metadata: [String: AnyJSON]) async {
        do {
            let rows: [ProfileRow] = try await SmashXClient.shared
                .from("profiles")
                .select()
                .eq("id", value: userId)
                .execute()
                .value
            if let row = rows.first {
                currentUser = Mappers.player(from: row)
                return
            }
            let name = metadata["name"]?.stringValue ?? "Player"
            let avatar = metadata["avatar"]?.stringValue ?? Avatar.defaultURL(seed: userId)
            struct Upsert: Encodable {
                let id: String
                let name: String
                let avatar: String
                let points: Int
                let wins: Int
                let losses: Int
                let rank_frame: String
            }
            let created: ProfileRow = try await SmashXClient.shared
                .from("profiles")
                .upsert(Upsert(id: userId, name: name, avatar: avatar, points: 1000, wins: 0, losses: 0, rank_frame: "unpolished"))
                .select()
                .single()
                .execute()
                .value
            currentUser = Mappers.player(from: created)
        } catch {
            currentUser = Player(
                id: userId,
                name: metadata["name"]?.stringValue ?? "Arena Player",
                avatar: metadata["avatar"]?.stringValue ?? Avatar.defaultURL(seed: userId),
                points: 1000,
                wins: 0,
                losses: 0,
                rankFrame: RankTier.unpolished.rawValue,
                specialFrame: nil
            )
        }
    }

    private func refreshProfiles() async throws {
        let rows: [ProfileRow] = try await SmashXClient.shared.from("profiles").select().execute().value
        users = rows.map(Mappers.player)
        if let currentUser {
            self.currentUser = users.first(where: { $0.id == currentUser.id }) ?? currentUser
        }
    }

    private func wireRealtime() {
        realtime.onSessionInsert = { [weak self] session in
            guard let self, self.isFresh() else { return }
            if !self.sessions.contains(where: { $0.id == session.id }) {
                self.sessions.append(session)
                self.sessions.sort { $0.startTime < $1.startTime }
            }
        }
        realtime.onSessionUpdate = { [weak self] session in
            guard let self, self.isFresh() else { return }
            self.upsertSession(session)
        }
        realtime.onSessionDelete = { [weak self] id in
            self?.sessions.removeAll { $0.id == id }
        }
        realtime.onProfileUpdate = { [weak self] player in
            guard let self, self.isFresh() else { return }
            self.users = self.users.map { $0.id == player.id ? player : $0 }
        }
        realtime.onStatus = { [weak self] status in
            self?.connectionStatus = status == "SUBSCRIBED" ? "live" : status.lowercased()
        }
    }

    private func resetLocalState() {
        isAuthenticated = false
        isBooting = false
        currentUser = nil
        users = []
        sessions = []
        pastSessions = []
        groups = []
        authRoute = .welcome
        connectionStatus = "disconnected"
    }

    private func upsertSession(_ session: Session) {
        if let index = sessions.firstIndex(where: { $0.id == session.id }) {
            sessions[index] = session
        } else if let index = pastSessions.firstIndex(where: { $0.id == session.id }) {
            pastSessions[index] = session
        } else {
            sessions.append(session)
        }
    }

    private func uniqueSessions(_ items: [Session]) -> [Session] {
        var seen = Set<String>()
        return items.filter { seen.insert($0.id).inserted }
    }

    private func lock(_ key: String) -> Bool {
        if mutatingKeys.contains(key) { return false }
        mutatingKeys.insert(key)
        return true
    }

    private func unlock(_ key: String) {
        mutatingKeys.remove(key)
    }

    @discardableResult
    private func incrementFetch() -> Int {
        fetchGeneration += 1
        return fetchGeneration
    }

    private func isFresh() -> Bool {
        true
    }

    private func unlockedRankFrames(_ points: Int) -> [String] {
        RankTier.allCases.filter { $0 != .unpolished && points >= $0.minimumPoints }.map(\.rawValue)
    }

    private func encodeJSON<T: Encodable>(_ value: T) throws -> AnyJSON {
        let data = try JSONEncoder().encode(value)
        return try JSONDecoder().decode(AnyJSON.self, from: data)
    }
}

private extension AnyJSON {
    var stringValue: String? {
        if case .string(let value) = self { return value }
        return nil
    }
}

private extension Session {
    func updating(
        title: String? = nil,
        location: String? = nil,
        startTime: String? = nil,
        endTime: String? = nil,
        courtCount: Int? = nil,
        playerIds: [String]? = nil,
        started: Bool? = nil,
        checkedInPlayerIds: [String]? = nil,
        checkInTimes: [String: String]? = nil,
        courtAssignments: [String: [String]]? = nil,
        matchStartTimes: [String: String]? = nil,
        matches: [MatchResult]? = nil,
        finalBill: FinalBill? = nil
    ) -> Session {
        var copy = self
        if let title { copy.title = title }
        if let location { copy.location = location }
        if let startTime { copy.startTime = startTime }
        if let endTime { copy.endTime = endTime }
        if let courtCount {
            copy.courtCount = courtCount
            copy.maxPlayers = SessionLifecycle.maxPlayers(courtCount: courtCount)
        }
        if let playerIds { copy.playerIds = playerIds }
        if let started { copy.started = started }
        if let checkedInPlayerIds { copy.checkedInPlayerIds = checkedInPlayerIds }
        if let checkInTimes { copy.checkInTimes = checkInTimes }
        if let courtAssignments { copy.courtAssignments = courtAssignments }
        if let matchStartTimes { copy.matchStartTimes = matchStartTimes }
        if let matches { copy.matches = matches }
        if let finalBill { copy.finalBill = finalBill }
        return copy
    }
}

private extension Player {
    func updating(points: Int? = nil, wins: Int? = nil, losses: Int? = nil) -> Player {
        var copy = self
        if let points {
            copy.points = points
            if specialFrame == nil {
                copy.rankFrame = RankTier.from(points: points).rawValue
            }
        }
        if let wins { copy.wins = wins }
        if let losses { copy.losses = losses }
        return copy
    }
}
