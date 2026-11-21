import SwiftUI

struct PlayersView: View {
    @Environment(AppStore.self) private var store
    let session: Session
    let isHost: Bool

    @State private var viewingPlayer: String?

    var body: some View {
        let checked = session.checkedInPlayerIds
        let waiting = session.playerIds.filter { !checked.contains($0) }

        VStack(alignment: .leading, spacing: 16) {
            if SessionLifecycle.phase(for: session) != .open {
                group("Checked in", ids: checked, checkedIn: true)
                group("Not here", ids: waiting, checkedIn: false)
            } else {
                group("Roster", ids: session.playerIds, checkedIn: false, showHost: true)
            }
        }
        .sheet(item: Binding(
            get: { viewingPlayer.map(IdentifiedString.init) },
            set: { viewingPlayer = $0?.id }
        )) { item in
            PlayerProfileSheet(playerId: item.id)
        }
    }

    private func group(_ title: String, ids: [String], checkedIn: Bool, showHost: Bool = false) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(SXFont.title(16))
                .textCase(.uppercase)
            if ids.isEmpty {
                Text("No one yet")
                    .font(SXFont.label(10))
                    .foregroundStyle(SXColor.muted)
            }
            ForEach(ids, id: \.self) { id in
                playerRow(id, checkedIn: checkedIn, showHost: showHost)
            }
        }
    }

    private func playerRow(_ id: String, checkedIn: Bool, showHost: Bool) -> some View {
        let player = store.player(id)
        return Button {
            viewingPlayer = id
        } label: {
            HStack {
                AvatarImage(urlString: player?.avatar ?? Avatar.defaultURL(seed: id), size: 36)
                VStack(alignment: .leading, spacing: 2) {
                    HStack {
                        Text(player?.name ?? "Player")
                            .font(SXFont.body(14))
                        if showHost && id == session.hostId {
                            Text("Host")
                                .font(SXFont.label(8))
                                .foregroundStyle(SXColor.muted)
                        }
                    }
                    if let player {
                        Text("\(player.points) RP · \(player.wins)W \(player.losses)L")
                            .font(SXFont.label(10))
                            .foregroundStyle(SXColor.muted)
                    }
                }
                Spacer()
                if isHost && SessionLifecycle.phase(for: session) != .open {
                    Button(checkedIn ? "Out" : "In") {
                        Task { await store.toggleCheckIn(sessionId: session.id, playerId: id) }
                    }
                    .font(SXFont.label(9))
                    .textCase(.uppercase)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(checkedIn ? Color.orange.opacity(0.2) : SXColor.neon.opacity(0.15))
                    .foregroundStyle(checkedIn ? Color.orange : SXColor.neon)
                }
            }
            .padding(12)
            .background(SXColor.card)
        }
        .buttonStyle(.plain)
    }
}

struct IdentifiedString: Identifiable {
    let id: String
}
