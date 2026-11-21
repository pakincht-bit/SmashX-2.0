import SwiftUI

struct ScoreboardView: View {
    @Environment(AppStore.self) private var store
    let session: Session

    @State private var viewingPlayer: String?

    var body: some View {
        let rows = Analytics.sessionStandings(session: session)
        VStack(alignment: .leading, spacing: 10) {
            Text("Scoreboard")
                .font(SXFont.title(16))
                .textCase(.uppercase)
            ForEach(Array(rows.enumerated()), id: \.element.id) { index, row in
                Button {
                    viewingPlayer = row.id
                } label: {
                    HStack {
                        Text("\(index + 1)")
                            .font(SXFont.numeric(16).italic())
                            .frame(width: 28)
                            .foregroundStyle(index == 0 ? SXColor.neon : .white)
                        AvatarImage(urlString: store.player(row.id)?.avatar ?? Avatar.defaultURL(seed: row.id), size: 32)
                        VStack(alignment: .leading) {
                            Text(store.player(row.id)?.name ?? "Player")
                                .font(SXFont.body(14))
                            Text("\(row.wins)W \(row.losses)L")
                                .font(SXFont.label(10))
                                .foregroundStyle(SXColor.muted)
                        }
                        Spacer()
                        Text(row.points >= 0 ? "+\(row.points)" : "\(row.points)")
                            .font(SXFont.numeric(18).italic())
                            .foregroundStyle(row.points >= 0 ? SXColor.neon : Color.red)
                    }
                    .padding(12)
                    .background(SXColor.structure)
                }
                .buttonStyle(.plain)
            }
        }
        .sheet(item: Binding(
            get: { viewingPlayer.map(IdentifiedString.init) },
            set: { viewingPlayer = $0?.id }
        )) { item in
            PlayerProfileSheet(playerId: item.id)
        }
    }
}
