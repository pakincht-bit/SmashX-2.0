import SwiftUI

struct RecordResultSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let session: Session
    let courtIndex: Int

    @State private var winner: Int?

    var body: some View {
        NavigationStack {
            let assigned = session.courtAssignments[String(courtIndex)] ?? []
            let mid = Int(ceil(Double(assigned.count) / 2))
            let team1 = Array(assigned.prefix(mid))
            let team2 = Array(assigned.suffix(from: mid))

            ScrollView {
                VStack(spacing: 16) {
                    teamBlock(title: "Blue", ids: team1, team: 1, color: .blue, team1: team1, team2: team2)
                    teamBlock(title: "Red", ids: team2, team: 2, color: .red, team1: team1, team2: team2)
                    SXButton(title: "Blue wins") { winner = 1 }
                    SXButton(title: "Red wins", kind: .outline) { winner = 2 }
                    SXButton(title: "Clear court", kind: .danger) {
                        Task {
                            await store.assignCourt(sessionId: session.id, courtIndex: courtIndex, playerIds: [])
                            dismiss()
                        }
                    }
                }
                .padding(20)
            }
            .arenaBackground()
            .navigationTitle("Match result")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundStyle(SXColor.muted)
                }
            }
            .safeAreaInset(edge: .bottom) {
                SXButton(title: "Confirm", enabled: winner != nil) {
                    guard let winner else { return }
                    Task {
                        await store.recordMatch(sessionId: session.id, courtIndex: courtIndex, winningTeamIndex: winner)
                        dismiss()
                    }
                }
                .padding(20)
                .background(SXColor.base)
            }
        }
        .preferredColorScheme(.dark)
    }

    private func teamBlock(title: String, ids: [String], team: Int, color: Color, team1: [String], team2: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(SXFont.label(11))
                .tracking(1.6)
                .foregroundStyle(color)
            ForEach(ids, id: \.self) { id in
                HStack {
                    AvatarImage(urlString: store.player(id)?.avatar ?? Avatar.defaultURL(seed: id), size: 28)
                    Text(store.player(id)?.name ?? "Player")
                        .font(SXFont.body(14))
                    Spacer()
                    if let winner {
                        let deltas = preview(team1: team1, team2: team2, winner: winner)
                        if let delta = deltas[id] {
                            Text("\(delta >= 0 ? "+" : "")\(delta)")
                                .font(SXFont.numeric(14).italic())
                                .foregroundStyle(delta >= 0 ? SXColor.neon : Color.red)
                        }
                    }
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(winner == team ? color.opacity(0.25) : SXColor.card)
    }

    private func preview(team1: [String], team2: [String], winner: Int) -> [String: Int] {
        Elo.computeDeltas(team1Ids: team1, team2Ids: team2, winningTeamIndex: winner, players: store.users)
    }
}
