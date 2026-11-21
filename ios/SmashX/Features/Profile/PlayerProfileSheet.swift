import SwiftUI

struct PlayerProfileSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let playerId: String

    var body: some View {
        NavigationStack {
            ScrollView {
                if let player = store.player(playerId) {
                    VStack(alignment: .leading, spacing: 16) {
                        HStack(spacing: 14) {
                            AvatarImage(urlString: player.avatar, size: 64)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(player.name)
                                    .font(SXFont.title(22))
                                Text(RankTier.from(points: player.points).displayName)
                                    .font(SXFont.label(10))
                                    .tracking(1.6)
                                    .foregroundStyle(SXColor.muted)
                            }
                        }
                        row("Rating", "\(player.points)")
                        row("Played", "\(player.played)")
                        row("Record", "\(player.wins)W \(player.losses)L")
                        row("Win rate", "\(player.winRate)%")
                    }
                    .padding(20)
                } else {
                    Text("Player not found")
                        .font(SXFont.body(14))
                        .foregroundStyle(SXColor.muted)
                        .padding()
                }
            }
            .arenaBackground()
            .navigationTitle("Player")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                        .foregroundStyle(SXColor.muted)
                }
            }
        }
        .preferredColorScheme(.dark)
        .presentationDetents([.medium, .large])
    }

    private func row(_ title: String, _ value: String) -> some View {
        HStack {
            Text(title)
                .font(SXFont.label(10))
                .tracking(1.6)
                .foregroundStyle(SXColor.muted)
            Spacer()
            Text(value)
                .font(SXFont.numeric(16).italic())
        }
        .padding(16)
        .background(SXColor.structure)
    }
}
