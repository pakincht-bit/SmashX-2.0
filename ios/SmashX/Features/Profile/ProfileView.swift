import SwiftUI

/// Profile screen, mirrors components/Profile.tsx.
struct ProfileView: View {
    @Environment(AppStore.self) private var store
    @State private var confirmLogout = false
    @State private var showActivity = false
    @State private var showStats = false
    @State private var showRecent = false
    @State private var confirmDelete = false
    @State private var deleteText = ""
    @State private var history: [Session] = []
    @State private var viewingPlayer: String?

    private struct Result: Identifiable {
        let id: String
        let won: Bool
        let delta: Int
        let date: Date
        let match: MatchResult
    }

    private var sessions: [Session] {
        var seen = Set<String>()
        return (history + store.sessions).filter { seen.insert($0.id).inserted }
    }

    private func results(for userId: String) -> [Result] {
        var out: [Result] = []
        for session in sessions {
            for match in session.matches where match.includes(userId) {
                let isTeam1 = match.team1Ids.contains(userId)
                let won = isTeam1 ? match.winningTeamIndex == 1 : match.winningTeamIndex == 2
                let date = ISO.date(from: match.timestamp) ?? ISO.date(from: session.startTime) ?? .distantPast
                out.append(Result(id: match.id, won: won, delta: Elo.delta(for: match, playerId: userId), date: date, match: match))
            }
        }
        return out.sorted { $0.date < $1.date }
    }

    var body: some View {
        ScrollView {
            if let user = store.activeUser {
                let all = results(for: user.id)
                let summary = Analytics.summary(for: user.id, sessions: sessions)
                VStack(spacing: 8) {
                    identity(user)
                    formCard(all, summary: summary)
                    synergyCard(summary)
                    activityCard(all)
                    dangerZone
                }
                .padding(.horizontal, 16)
                .padding(.top, 8)
                .padding(.bottom, 32)
            }
        }
        .arenaBackground()
        .hidesTabBar()
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    Haptics.play(.medium)
                    confirmLogout = true
                } label: {
                    Image(systemName: "rectangle.portrait.and.arrow.right")
                        .foregroundStyle(Color(white: 0.6))
                }
                .accessibilityLabel("Log out")
            }
        }
        .task {
            if let user = store.activeUser {
                history = await store.fetchSessions(containing: user.id)
            }
        }
        .confirmationDialog("Log out?", isPresented: $confirmLogout, titleVisibility: .visible) {
            Button("Log Out", role: .destructive) { Task { await store.logout() } }
        }
        .alert("Purge Identity?", isPresented: $confirmDelete) {
            TextField("Type DELETE", text: $deleteText)
            Button("Confirm Purge", role: .destructive) {
                if deleteText == "DELETE" { Task { await store.deleteAccount() } }
                deleteText = ""
            }
            Button("Cancel", role: .cancel) { deleteText = "" }
        } message: {
            Text("This will permanently delete your profile and rank from SmashX. This action cannot be undone. Type DELETE to confirm.")
        }
        .sheet(isPresented: $showActivity) { ActivitySheet() }
        .fullScreenCover(isPresented: $showStats) {
            StatsView(onClose: { showStats = false })
        }
        .sheet(isPresented: $showRecent) {
            RecentMatchesSheet(results: results(for: store.activeUser?.id ?? "").suffix(10).reversed().map {
                RecentMatchRow(id: $0.id, won: $0.won, delta: $0.delta, date: $0.date, match: $0.match)
            }, me: store.activeUser?.id ?? "")
        }
        .sheet(item: Binding(
            get: { viewingPlayer.map(IdentifiedString.init) },
            set: { viewingPlayer = $0?.id }
        )) { item in
            PlayerProfileSheet(playerId: item.id)
        }
    }

    // MARK: Identity

    private func identity(_ user: Player) -> some View {
        let rank = (store.users.sorted { $0.points > $1.points }.firstIndex { $0.id == user.id } ?? -1) + 1
        return VStack(spacing: 16) {
            HStack(spacing: 32) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Rank #\(rank)")
                        .font(SXFont.label(12).italic())
                        .textCase(.uppercase)
                        .tracking(2.4)
                        .foregroundStyle(Color(white: 0.6))
                    Text(user.name)
                        .font(SXFont.title(28))
                        .tracking(-1)
                        .lineLimit(1)
                        .minimumScaleFactor(0.6)
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                NavigationLink {
                    SettingsView()
                } label: {
                    AvatarImage(urlString: user.avatar, size: 80)
                        .overlay(Circle().strokeBorder(SXColor.structure, lineWidth: 3))
                        .overlay(alignment: .bottomTrailing) {
                            Image(systemName: "pencil")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundStyle(SXColor.neon)
                                .padding(7)
                                .background(SXColor.card)
                                .overlay(Rectangle().strokeBorder(SXColor.structure, lineWidth: 2))
                                .offset(x: 4, y: 4)
                        }
                }
                .buttonStyle(.plain)
            }

            HStack(alignment: .top, spacing: 8) {
                stat("Pts", "\(user.points)", color: SXColor.neon)
                stat("Played", "\(user.played)")
                VStack(alignment: .leading, spacing: 2) {
                    label("W-L")
                    HStack(spacing: 2) {
                        Text("\(user.wins)").foregroundStyle(SXColor.neon)
                        Text("/").foregroundStyle(Color(white: 0.4))
                        Text("\(user.losses)").foregroundStyle(.red)
                    }
                    .font(SXFont.numeric(20).italic())
                    .lineLimit(1)
                    .minimumScaleFactor(0.6)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                stat("Win Rate", "\(user.winRate)%", color: winRateColor(user.winRate))
            }
        }
        .padding(16)
    }

    private func winRateColor(_ rate: Int) -> Color {
        if rate >= 70 { return SXColor.neon }
        if rate >= 55 { return Color(red: 0.98, green: 0.8, blue: 0.08) }
        if rate >= 45 { return Color(red: 0.13, green: 0.83, blue: 0.93) }
        return Color(red: 0.94, green: 0.27, blue: 0.27)
    }

    private func label(_ text: String) -> some View {
        Text(text)
            .font(SXFont.label(9))
            .textCase(.uppercase)
            .tracking(1.6)
            .foregroundStyle(Color(white: 0.5))
    }

    private func stat(_ title: String, _ value: String, color: Color = .white) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            label(title)
            Text(value)
                .font(SXFont.numeric(20).italic())
                .foregroundStyle(color)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    // MARK: Cards

    private func cardHeader(_ first: String, _ second: String, action: String, onTap: @escaping () -> Void) -> some View {
        HStack(alignment: .firstTextBaseline) {
            HStack(spacing: 4) {
                Text(first).foregroundStyle(.white)
                Text(second).foregroundStyle(Color(white: 0.5))
            }
            .font(SXFont.title(14))
            .textCase(.uppercase)
            .tracking(1)
            Spacer()
            Button {
                Haptics.play(.light)
                onTap()
            } label: {
                HStack(spacing: 4) {
                    Text(action)
                    Image(systemName: "chevron.right").foregroundStyle(SXColor.neon)
                }
                .font(SXFont.label(9))
                .textCase(.uppercase)
                .tracking(1.6)
                .foregroundStyle(Color(white: 0.5))
            }
            .buttonStyle(.plain)
        }
    }

    private func formCard(_ all: [Result], summary: PlayerStatsSummary) -> some View {
        let last10 = Array(all.suffix(10))
        let streak = summary.currentStreak
        let maxAbs = max(5, last10.map { abs($0.delta) }.max() ?? 5)
        let half: CGFloat = 34
        return VStack(alignment: .leading, spacing: 12) {
            cardHeader("Form &", "Streaks", action: "View last 10") { showRecent = true }
            HStack(alignment: .bottom, spacing: 16) {
                VStack(alignment: .leading, spacing: 12) {
                    stat("Current", streak == 0 ? "-" : "\(abs(streak))\(streak > 0 ? "W" : "L")",
                         color: streak == 0 ? .white : streak > 0 ? SXColor.neon : .red)
                    stat("Best", "\(summary.maxWinStreak)W")
                }
                Spacer(minLength: 0)
                HStack(spacing: 6) {
                    ForEach(0..<10, id: \.self) { idx in
                        let offset = 10 - last10.count
                        if idx < offset {
                            Rectangle().fill(Color.white.opacity(0.05)).frame(width: 14, height: 2)
                                .transformEffect(CGAffineTransform(a: 1, b: 0, c: -0.2, d: 1, tx: 0, ty: 0))
                        } else {
                            let d = last10[idx - offset].delta
                            let h = max(4, CGFloat(abs(d)) / CGFloat(maxAbs) * half)
                            ZStack {
                                Rectangle()
                                    .fill(d >= 0 ? SXColor.neon : Color.red)
                                    .frame(width: 14, height: h)
                                    .transformEffect(CGAffineTransform(a: 1, b: 0, c: -0.2, d: 1, tx: 0, ty: 0))
                                    .frame(height: half * 2, alignment: d >= 0 ? .bottom : .top)
                                    .offset(y: d >= 0 ? -half : half)
                                    .frame(height: half * 2)
                            }
                            .frame(width: 14, height: half * 2)
                        }
                    }
                }
                .frame(height: half * 2)
                .background {
                    VStack {
                        Rectangle().fill(Color.white.opacity(0.1)).frame(height: 1)
                        Spacer()
                        Rectangle().fill(Color.white.opacity(0.2)).frame(height: 1)
                        Spacer()
                        Rectangle().fill(Color.white.opacity(0.1)).frame(height: 1)
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SXColor.card)
    }

    private func synergyCard(_ summary: PlayerStatsSummary) -> some View {
        func enc(_ id: String?) -> EncounterStat? {
            guard let id else { return nil }
            return summary.encounters.first { $0.id == id }
        }
        return VStack(alignment: .leading, spacing: 12) {
            cardHeader("Social", "Synergy", action: "View stats") { showStats = true }
            VStack(spacing: 4) {
                synergyRow("Most Played", .blue, id: summary.frequentDuoId, empty: "No Data Yet", icon: "person.2") {
                    guard let e = enc(summary.frequentDuoId) else { return "" }
                    return "\(e.playedWith)"
                }
                synergyRow("Best Duo", SXColor.neon, id: summary.duoPartnerId, empty: "No Data Yet", icon: "person.2") {
                    guard let e = enc(summary.duoPartnerId) else { return "" }
                    return "\(e.teammateWinRate)%"
                }
                synergyRow("Most Wins", .orange, id: summary.easyTargetId, empty: "No Enemies Yet", icon: "bolt") {
                    guard let e = enc(summary.easyTargetId), e.playedAgainst > 0 else { return "" }
                    return "\(Int((Double(e.playedAgainst - e.lostAgainst) / Double(e.playedAgainst) * 100).rounded()))%"
                }
                synergyRow("Most Losses", .red, id: summary.nemesisId, empty: "No Enemies Yet", icon: "bolt") {
                    guard let e = enc(summary.nemesisId), e.playedAgainst > 0 else { return "" }
                    return "\(Int((Double(e.playedAgainst - e.lostAgainst) / Double(e.playedAgainst) * 100).rounded()))%"
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SXColor.card)
    }

    private func synergyRow(_ title: String, _ tint: Color, id: String?, empty: String, icon: String, metric: () -> String) -> some View {
        let player = id.flatMap { store.player($0) }
        return Button {
            if let player { Haptics.play(.light); viewingPlayer = player.id }
        } label: {
            HStack(spacing: 12) {
                if let player {
                    AvatarImage(urlString: player.avatar, size: 36)
                } else {
                    Image(systemName: icon)
                        .font(.system(size: 14))
                        .foregroundStyle(Color(white: 0.4))
                        .frame(width: 36, height: 36)
                        .background(SXColor.base, in: Circle())
                }
                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(SXFont.label(9))
                        .textCase(.uppercase)
                        .tracking(1.6)
                        .foregroundStyle(tint)
                    Text(player?.name ?? empty)
                        .font(SXFont.body(14))
                        .foregroundStyle(player == nil ? Color(white: 0.5) : .white)
                        .lineLimit(1)
                }
                Spacer()
                if player != nil {
                    Text(metric())
                        .font(SXFont.numeric(16).italic())
                        .foregroundStyle(tint == .red ? Color.red : SXColor.neon)
                }
            }
            .padding(12)
            .frame(maxWidth: .infinity)
            .background(LinearGradient(colors: [tint.opacity(0.10), .clear], startPoint: .leading, endPoint: .trailing))
            .overlay(alignment: .leading) { Rectangle().fill(tint.opacity(0.5)).frame(width: 2) }
            .opacity(player == nil ? 0.7 : 1)
        }
        .buttonStyle(.plain)
        .disabled(player == nil)
    }

    private func activityCard(_ all: [Result]) -> some View {
        let cal = Calendar.current
        let now = Date()
        let monthStart = cal.date(from: cal.dateComponents([.year, .month], from: now)) ?? now
        let range = cal.range(of: .day, in: .month, for: now) ?? 1..<31
        let monthResults = all.filter { cal.isDate($0.date, equalTo: now, toGranularity: .month) }
        var byDay: [Int: (count: Int, pts: Int)] = [:]
        for r in monthResults {
            let d = cal.component(.day, from: r.date)
            byDay[d, default: (0, 0)].count += 1
            byDay[d, default: (0, 0)].pts += r.delta
        }
        let net = monthResults.reduce(0) { $0 + $1.delta }
        let leading = cal.component(.weekday, from: monthStart) - 1
        let cells: [Int?] = Array(repeating: nil, count: leading) + range.map { Optional($0) }
        let today = cal.component(.day, from: now)

        return Button {
            Haptics.play(.light)
            showActivity = true
        } label: {
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Text(now.formatted(.dateTime.month(.abbreviated).year()))
                        .font(SXFont.title(14))
                        .textCase(.uppercase)
                        .tracking(1)
                    Spacer()
                    HStack(spacing: 4) {
                        Text("View activity log")
                        Image(systemName: "chevron.right").foregroundStyle(SXColor.neon)
                    }
                    .font(SXFont.label(9))
                    .textCase(.uppercase)
                    .tracking(1.6)
                    .foregroundStyle(Color(white: 0.5))
                }
                HStack(alignment: .bottom, spacing: 16) {
                    VStack(alignment: .leading, spacing: 12) {
                        stat("Matches", "\(monthResults.count)")
                        stat("Net pts", net > 0 ? "+\(net)" : "\(net)",
                             color: net > 0 ? SXColor.neon : net < 0 ? .red : .white)
                    }
                    Spacer(minLength: 0)
                    LazyVGrid(columns: Array(repeating: GridItem(.fixed(14), spacing: 6), count: 7), spacing: 6) {
                        ForEach(Array(cells.enumerated()), id: \.offset) { _, day in
                            Rectangle()
                                .fill(dotColor(day, today: today, byDay: byDay))
                                .frame(width: 14, height: 14)
                        }
                    }
                    .frame(width: 7 * 14 + 6 * 6)
                }
            }
            .padding(16)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(SXColor.card)
            .foregroundStyle(.white)
        }
        .buttonStyle(.plain)
        .padding(.bottom, 16)
    }

    private func dotColor(_ day: Int?, today: Int, byDay: [Int: (count: Int, pts: Int)]) -> Color {
        guard let day else { return .clear }
        if day > today { return Color.white.opacity(0.05) }
        guard let d = byDay[day], d.count > 0 else { return Color.white.opacity(0.10) }
        if d.pts > 0 { return SXColor.neon }
        if d.pts < 0 { return .red }
        return .gray
    }

    private var dangerZone: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 8) {
                Image(systemName: "exclamationmark.triangle").font(.system(size: 11))
                Text("Danger Zone")
                    .font(SXFont.label(9))
                    .textCase(.uppercase)
                    .tracking(1.6)
            }
            Text("Permanently purge your profile, pts, and match history.")
                .font(.system(size: 10, weight: .medium))
            Button {
                Haptics.play(.medium)
                confirmDelete = true
            } label: {
                Text("Delete account")
                    .font(SXFont.label(9))
                    .textCase(.uppercase)
                    .tracking(1.6)
                    .foregroundStyle(Color(white: 0.55))
            }
            .buttonStyle(.plain)
        }
        .foregroundStyle(Color(white: 0.4))
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SXColor.structure.opacity(0.6))
    }
}

struct RecentMatchRow: Identifiable {
    let id: String
    let won: Bool
    let delta: Int
    let date: Date
    let match: MatchResult
}

private struct RecentMatchesSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let results: [RecentMatchRow]
    let me: String

    var body: some View {
        NavigationStack {
            ScrollView {
                if results.isEmpty {
                    Text("No matches yet")
                        .font(SXFont.label(10))
                        .textCase(.uppercase)
                        .tracking(1.6)
                        .foregroundStyle(SXColor.muted)
                        .padding(.vertical, 64)
                } else {
                    VStack(spacing: 4) {
                        ForEach(results) { r in
                            let mine = r.match.team1Ids.contains(me) ? r.match.team1Ids : r.match.team2Ids
                            let theirs = r.match.team1Ids.contains(me) ? r.match.team2Ids : r.match.team1Ids
                            HStack(spacing: 12) {
                                Text(r.won ? "W" : "L")
                                    .font(SXFont.label(14).italic())
                                    .foregroundStyle(r.won ? SXColor.neon : .red)
                                    .frame(width: 24)
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(mine.filter { $0 != me }.compactMap { store.player($0)?.name }.joined(separator: " & ").nonEmpty ?? "Solo")
                                        .font(SXFont.label(12))
                                        .textCase(.uppercase)
                                    Text("vs " + theirs.compactMap { store.player($0)?.name }.joined(separator: " & "))
                                        .font(SXFont.label(10))
                                        .textCase(.uppercase)
                                        .tracking(1)
                                        .foregroundStyle(Color(white: 0.5))
                                        .lineLimit(1)
                                }
                                Spacer()
                                VStack(alignment: .trailing, spacing: 4) {
                                    Text(r.delta > 0 ? "+\(r.delta)" : "\(r.delta)")
                                        .font(SXFont.numeric(16).italic())
                                        .foregroundStyle(r.delta >= 0 ? SXColor.neon : .red)
                                    Text(r.date.formatted(.dateTime.month(.abbreviated).day()))
                                        .font(SXFont.label(9))
                                        .textCase(.uppercase)
                                        .foregroundStyle(Color(white: 0.5))
                                }
                            }
                            .padding(12)
                            .background(SXColor.card)
                        }
                    }
                    .padding(16)
                }
            }
            .arenaBackground()
            .navigationTitle("Last 10 Matches")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") { dismiss() } } }
        }
        .preferredColorScheme(.dark)
    }
}

private extension String {
    var nonEmpty: String? { isEmpty ? nil : self }
}
