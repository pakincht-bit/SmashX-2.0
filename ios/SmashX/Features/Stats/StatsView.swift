import SwiftUI

struct StatsView: View {
    @Environment(AppStore.self) private var store
    @State private var history: [Session] = []
    @State private var viewingPlayer: String?
    var onClose: (() -> Void)? = nil

    var body: some View {
        @Bindable var store = store
        NavigationStack {
            Group {
                if let user = store.activeUser {
                    let summary = Analytics.summary(for: user.id, sessions: history)
                    let progress = RankTier.progress(points: user.points)
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            cutout("Rank", RankTier.from(points: user.points).displayName)
                            cutout("Rating", "\(user.points)")
                            cutout("Record", "\(user.wins)W \(user.losses)L (\(user.winRate)%)")

                            VStack(alignment: .leading, spacing: 8) {
                                Text("Next: \(progress.nextName)")
                                    .font(SXFont.label(10))
                                    .tracking(1.6)
                                    .foregroundStyle(SXColor.muted)
                                ProgressView(value: progress.progress)
                                    .tint(SXColor.neon)
                                Text(progress.remaining == 0 ? "Max" : "\(progress.remaining) RP")
                                    .font(SXFont.numeric(12))
                                    .foregroundStyle(SXColor.neon)
                            }
                            .padding(16)
                            .background(SXColor.structure)

                            SXSectionTitle(text: "Form")
                            cutout("Current streak", streakLabel(summary.currentStreak))
                            cutout("Best win streak", "\(summary.maxWinStreak)")
                            if !summary.last10.isEmpty {
                                HStack {
                                    Text("Last \(summary.last10.count)")
                                        .font(SXFont.label(10))
                                        .tracking(1.4)
                                        .foregroundStyle(SXColor.muted)
                                    Spacer()
                                    HStack(spacing: 4) {
                                        ForEach(Array(summary.last10.enumerated()), id: \.offset) { _, won in
                                            Circle()
                                                .fill(won ? SXColor.neon : Color.red)
                                                .frame(width: 8, height: 8)
                                        }
                                    }
                                }
                                .padding(16)
                                .background(SXColor.structure)
                            }

                            SXSectionTitle(text: "Partners")
                            personRow("Best duo", summary.duoPartnerId)
                            personRow("Most played", summary.frequentDuoId)
                            personRow("Nemesis", summary.nemesisId)
                            personRow("Easy target", summary.easyTargetId)
                        }
                        .padding(20)
                        .padding(.bottom, 96)
                    }
                } else {
                    Text("Sign in to see stats")
                        .font(SXFont.title(18))
                        .foregroundStyle(SXColor.muted)
                }
            }
            .arenaBackground()
            .toolbar {
                if let onClose {
                    ToolbarItem(placement: .cancellationAction) { Button("Close", action: onClose) }
                }
            }
            .navigationTitle("Stats")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                if let id = store.activeUser?.id {
                    history = await store.fetchSessions(containing: id)
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

    private func cutout(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(title)
                .font(SXFont.label(10))
                .tracking(1.6)
                .foregroundStyle(SXColor.muted)
            Text(value)
                .font(SXFont.title(20))
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SXColor.structure)
    }

    @ViewBuilder
    private func personRow(_ title: String, _ id: String?) -> some View {
        if let id, let player = store.player(id) {
            Button {
                viewingPlayer = id
            } label: {
                HStack {
                    Text(title)
                        .font(SXFont.label(10))
                        .tracking(1.4)
                        .foregroundStyle(SXColor.muted)
                    Spacer()
                    Text(player.name)
                        .font(SXFont.body(14))
                        .foregroundStyle(SXColor.neon)
                }
                .padding(16)
                .background(SXColor.card)
            }
            .buttonStyle(.plain)
        } else {
            HStack {
                Text(title)
                    .font(SXFont.label(10))
                    .tracking(1.4)
                    .foregroundStyle(SXColor.muted)
                Spacer()
                Text("—")
                    .foregroundStyle(SXColor.muted)
            }
            .padding(16)
            .background(SXColor.structure)
        }
    }

    private func streakLabel(_ value: Int) -> String {
        if value > 0 { return "\(value) wins" }
        if value < 0 { return "\(-value) losses" }
        return "None"
    }
}
