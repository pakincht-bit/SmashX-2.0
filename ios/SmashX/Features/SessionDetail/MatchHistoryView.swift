import SwiftUI

struct MatchHistoryView: View {
    @Environment(AppStore.self) private var store
    let session: Session
    let isHost: Bool
    let canUndo: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Matches")
                .font(SXFont.title(16))
                .textCase(.uppercase)
            if session.matches.isEmpty {
                Text("No matches yet")
                    .font(SXFont.label(10))
                    .foregroundStyle(SXColor.muted)
            } else {
                ForEach(session.matches.reversed()) { match in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            teamText(match.team1Ids, won: match.winningTeamIndex == 1)
                            Text("vs")
                                .font(SXFont.label(10))
                                .foregroundStyle(SXColor.muted)
                            teamText(match.team2Ids, won: match.winningTeamIndex == 2)
                        }
                        HStack {
                            if let time = ISO.date(from: match.timestamp) {
                                Text(time.formatted(date: .omitted, time: .shortened))
                                    .font(SXFont.label(10))
                                    .foregroundStyle(SXColor.muted)
                            }
                            Spacer()
                            if isHost && canUndo {
                                Button("Undo") {
                                    Task { await store.undoMatch(sessionId: session.id, matchId: match.id) }
                                }
                                .font(SXFont.label(10))
                                .foregroundStyle(.red)
                            }
                        }
                    }
                    .padding(12)
                    .background(SXColor.card)
                }
            }
        }
    }

    private func teamText(_ ids: [String], won: Bool) -> some View {
        Text(ids.map { store.player($0)?.name ?? "Player" }.joined(separator: " & "))
            .font(SXFont.body(12))
            .foregroundStyle(won ? SXColor.neon : SXColor.muted)
            .frame(maxWidth: .infinity, alignment: won ? .leading : .trailing)
    }
}
