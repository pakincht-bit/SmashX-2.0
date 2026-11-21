import SwiftUI

/// Ranks tab, mirrors components/Leaderboard.tsx.
struct LeaderboardView: View {
    @Environment(AppStore.self) private var store
    @State private var range = 0
    @State private var month = Date()
    @State private var monthlySessions: [Session] = []
    @State private var isLoadingMonth = false
    @State private var sortCol = SortCol.pts
    @State private var sortDesc = true
    @State private var groupFilterId: String?
    @State private var viewingPlayer: String?

    enum SortCol { case pts, w, l, wr }

    private var isCurrentMonth: Bool {
        Calendar.current.isDate(month, equalTo: .now, toGranularity: .month)
    }

    private var isFirstMonth: Bool {
        let c = Calendar.current.dateComponents([.year, .month], from: month)
        return c.year == 2026 && c.month == 1
    }

    private var selectedGroup: PlayerGroup? {
        store.groups.first { $0.id == groupFilterId }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    titleMenu
                        .padding(.horizontal, 20)
                        .padding(.bottom, 16)

                    timeTabs
                    if range == 1 { monthSelector }
                    columnHeaders

                    if isLoadingMonth {
                        ProgressView().tint(SXColor.neon).frame(maxWidth: .infinity).padding(.vertical, 48)
                    } else if rows.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "person.3").font(.system(size: 28)).foregroundStyle(Color(white: 0.35))
                            Text(selectedGroup != nil ? "No ranked matches in this group" : "No ranked matches yet")
                                .font(SXFont.label(11))
                                .textCase(.uppercase)
                                .tracking(1.2)
                                .foregroundStyle(SXColor.muted)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 64)
                    } else {
                        ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                            rowView(row, index: index)
                        }
                    }
                }
                .padding(.top, 12)
                .padding(.bottom, 24)
            }
            .refreshable { await store.refresh() }
            .arenaBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarLeading) { ProfilePill() } }
            .task(id: "\(range)-\(month.timeIntervalSince1970)") {
                guard range == 1 else { return }
                isLoadingMonth = true
                monthlySessions = await store.fetchSessions(inMonth: month)
                isLoadingMonth = false
            }
            .sheet(item: Binding(
                get: { viewingPlayer.map(IdentifiedString.init) },
                set: { viewingPlayer = $0?.id }
            )) { item in
                PlayerProfileSheet(playerId: item.id)
            }
        }
    }

    // MARK: Header

    private var titleMenu: some View {
        Menu {
            Button {
                Haptics.play(.light)
                groupFilterId = nil
            } label: {
                Label("All players  \(store.users.count)", systemImage: groupFilterId == nil ? "checkmark" : "person.3")
            }
            ForEach(store.groups) { group in
                Button {
                    Haptics.play(.light)
                    groupFilterId = group.id
                } label: {
                    Label("\(group.name)  \(group.memberIds.count)", systemImage: groupFilterId == group.id ? "checkmark" : "person.3")
                }
            }
        } label: {
            HStack(spacing: 8) {
                if let group = selectedGroup {
                    Text(group.name).font(SXFont.title(20)).tracking(-0.8).textCase(.uppercase).lineLimit(1)
                    Text("Ranks").font(SXFont.title(20)).tracking(-0.8).textCase(.uppercase).foregroundStyle(SXColor.neon)
                } else {
                    Text("All").font(SXFont.title(20)).tracking(-0.8).textCase(.uppercase)
                    Text("Rankings").font(SXFont.title(20)).tracking(-0.8).textCase(.uppercase).foregroundStyle(SXColor.neon)
                }
                if !store.groups.isEmpty {
                    Image(systemName: "chevron.down")
                        .font(.system(size: 14, weight: .black))
                        .foregroundStyle(SXColor.neon)
                }
            }
            .foregroundStyle(.white)
        }
        .disabled(store.groups.isEmpty)
    }

    private var timeTabs: some View {
        HStack(spacing: 0) {
            ForEach(Array(["All Time", "Monthly"].enumerated()), id: \.offset) { i, title in
                Button {
                    Haptics.play(.light)
                    range = i
                } label: {
                    Text(title)
                        .font(SXFont.label(10))
                        .textCase(.uppercase)
                        .tracking(1.6)
                        .foregroundStyle(range == i ? SXColor.neon : Color(white: 0.5))
                        .frame(maxWidth: .infinity)
                        .padding(.top, 8)
                        .padding(.bottom, 12)
                        .overlay(alignment: .bottom) {
                            Rectangle().fill(range == i ? SXColor.neon : .clear).frame(height: 2)
                        }
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 16)
        .overlay(alignment: .bottom) { Rectangle().fill(Color.white.opacity(0.1)).frame(height: 1) }
        .padding(.bottom, 8)
    }

    private var monthSelector: some View {
        HStack {
            Button {
                Haptics.play(.light)
                month = Calendar.current.date(byAdding: .month, value: -1, to: month) ?? month
            } label: {
                Image(systemName: "chevron.left").padding(8)
            }
            .foregroundStyle(isFirstMonth ? Color(white: 0.3) : Color(white: 0.6))
            .disabled(isFirstMonth)
            Spacer()
            Text(month.formatted(.dateTime.month(.wide).year()))
                .font(SXFont.label(12))
                .textCase(.uppercase)
                .tracking(1.6)
                .foregroundStyle(SXColor.neon)
            Spacer()
            Button {
                Haptics.play(.light)
                month = Calendar.current.date(byAdding: .month, value: 1, to: month) ?? month
            } label: {
                Image(systemName: "chevron.right").padding(8)
            }
            .foregroundStyle(isCurrentMonth ? Color(white: 0.3) : Color(white: 0.6))
            .disabled(isCurrentMonth)
        }
        .font(.system(size: 14, weight: .bold))
        .padding(.horizontal, 16)
        .padding(.vertical, 4)
        .background(Color.white.opacity(0.05))
        .padding(.horizontal, 16)
        .padding(.bottom, 8)
    }

    private var columnHeaders: some View {
        HStack(spacing: 0) {
            Text("Player")
                .font(SXFont.label(9))
                .textCase(.uppercase)
                .tracking(1.6)
                .foregroundStyle(Color(white: 0.4))
                .frame(maxWidth: .infinity, alignment: .leading)
            header(.w, "W", width: 40, align: .center)
            header(.l, "L", width: 40, align: .center)
            header(.wr, "WR%", width: 48, align: .center)
            header(.pts, range == 1 ? "+/-" : "PTS", width: 56, align: .trailing)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
    }

    private func header(_ col: SortCol, _ label: String, width: CGFloat, align: Alignment) -> some View {
        let active = sortCol == col
        return Button {
            if active { sortDesc.toggle() } else { sortCol = col; sortDesc = true }
        } label: {
            HStack(spacing: 2) {
                Text(label)
                if active { Text(sortDesc ? "▼" : "▲").font(.system(size: 8)) }
            }
            .font(SXFont.label(9))
            .textCase(.uppercase)
            .tracking(1.2)
            .foregroundStyle(active ? (col == .l ? Color.red : SXColor.neon) : Color(white: 0.4))
            .frame(width: width, alignment: align)
        }
        .buttonStyle(.plain)
    }

    // MARK: Rows

    private func rowView(_ row: Row, index: Int) -> some View {
        let isMe = row.player.id == store.activeUser?.id
        let rankColor: Color = index == 0 ? Color(red: 0.92, green: 0.7, blue: 0.03)
            : index == 1 ? Color(white: 0.82)
            : index == 2 ? Color(red: 0.7, green: 0.33, blue: 0.04)
            : Color(white: 0.6)
        let ptsText = range == 1 ? signed(row.points) : "\(row.points)"
        let ptsColor: Color = range == 1
            ? (row.points > 0 ? SXColor.neon : row.points < 0 ? .red : .white)
            : (sortCol == .pts ? SXColor.neon : .white)

        return Button {
            Haptics.play(.light)
            viewingPlayer = row.id
        } label: {
            HStack(spacing: 0) {
                HStack(spacing: 12) {
                    Text("\(index + 1)")
                        .font(SXFont.label(14).italic())
                        .foregroundStyle(rankColor)
                        .frame(width: 24)
                    AvatarImage(urlString: row.player.avatar, size: 40)
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 8) {
                            Text(row.player.name)
                                .font(SXFont.body(14))
                                .lineLimit(1)
                            if isMe {
                                Text("YOU")
                                    .font(SXFont.label(8).italic())
                                    .tracking(1.4)
                                    .foregroundStyle(SXColor.navyInk)
                                    .padding(.horizontal, 4)
                                    .background(SXColor.neon)
                            }
                        }
                        Text("\(row.played) matches")
                            .font(SXFont.label(10))
                            .foregroundStyle(Color(white: 0.5))
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)

                Text("\(row.wins)")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(sortCol == .w ? SXColor.neon : .white)
                    .frame(width: 40)
                Text("\(row.losses)")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(sortCol == .l ? Color.red : .white)
                    .frame(width: 40)
                Text("\(row.winRate)%")
                    .font(SXFont.label(12).italic())
                    .foregroundStyle(sortCol == .wr ? (row.winRate >= 50 ? SXColor.neon : Color.orange) : .white)
                    .frame(width: 48)
                Text(ptsText)
                    .font(SXFont.numeric(14).italic())
                    .foregroundStyle(ptsColor)
                    .frame(width: 56, alignment: .trailing)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(isMe ? SXColor.neon.opacity(0.10) : .clear)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    private struct Row: Identifiable {
        var id: String { player.id }
        var player: Player
        var played: Int
        var wins: Int
        var losses: Int
        var winRate: Int
        var points: Int
    }

    private var rows: [Row] {
        var computed: [Row]
        if range == 0 {
            computed = store.users.map {
                Row(player: $0, played: $0.played, wins: $0.wins, losses: $0.losses, winRate: $0.winRate, points: $0.points)
            }
        } else {
            var stats: [String: (p: Int, w: Int, l: Int, pts: Int)] = [:]
            store.users.forEach { stats[$0.id] = (0, 0, 0, 0) }
            for session in monthlySessions {
                for match in session.matches {
                    for id in match.winners() where stats[id] != nil {
                        stats[id]!.p += 1; stats[id]!.w += 1
                        stats[id]!.pts += Elo.delta(for: match, playerId: id)
                    }
                    for id in match.losers() where stats[id] != nil {
                        stats[id]!.p += 1; stats[id]!.l += 1
                        stats[id]!.pts += Elo.delta(for: match, playerId: id)
                    }
                }
            }
            computed = store.users.map { player in
                let s = stats[player.id] ?? (0, 0, 0, 0)
                return Row(player: player, played: s.p, wins: s.w, losses: s.l,
                           winRate: s.p > 0 ? Int((Double(s.w) / Double(s.p) * 100).rounded()) : 0, points: s.pts)
            }
        }
        let members = selectedGroup.map { Set($0.memberIds) }
        computed = computed.filter { row in
            row.played >= 1 && (members?.contains(row.player.id) ?? true)
        }
        func value(_ r: Row) -> Int {
            switch sortCol {
            case .pts: return r.points
            case .w: return r.wins
            case .l: return r.losses
            case .wr: return r.winRate
            }
        }
        return computed.sorted { sortDesc ? value($0) > value($1) : value($0) < value($1) }
    }

    private func signed(_ value: Int) -> String {
        value > 0 ? "+\(value)" : "\(value)"
    }
}
