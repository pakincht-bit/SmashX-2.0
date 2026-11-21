import SwiftUI

struct ActivitySheet: View {
    @Environment(AppStore.self) private var store
    @State private var days: [(date: Date, matches: Int, points: Int)] = []

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    if days.isEmpty {
                        Text("No match history yet")
                            .font(SXFont.label(11))
                            .foregroundStyle(SXColor.muted)
                    } else {
                        ForEach(days, id: \.date) { day in
                            HStack {
                                Text(day.date.formatted(date: .abbreviated, time: .omitted))
                                    .font(SXFont.body(13))
                                Spacer()
                                Text("\(day.matches) matches · \(day.points >= 0 ? "+" : "")\(day.points)")
                                    .font(SXFont.numeric(13).italic())
                                    .foregroundStyle(SXColor.neon)
                            }
                            .padding(16)
                            .background(SXColor.structure)
                        }
                    }
                }
                .padding(20)
            }
            .arenaBackground()
            .navigationTitle("Activity")
            .navigationBarTitleDisplayMode(.inline)
            .task { await load() }
        }
        .preferredColorScheme(.dark)
    }

    private func load() async {
        guard let user = store.activeUser else { return }
        let sessions = await store.fetchSessions(containing: user.id)
        var buckets: [Date: (Int, Int)] = [:]
        let calendar = Calendar.current
        for session in sessions {
            for match in session.matches where match.includes(user.id) {
                let date = calendar.startOfDay(for: ISO.date(from: match.timestamp) ?? ISO.date(from: session.startTime) ?? .now)
                let current = buckets[date] ?? (0, 0)
                buckets[date] = (current.0 + 1, current.1 + Elo.delta(for: match, playerId: user.id))
            }
        }
        days = buckets
            .map { (date: $0.key, matches: $0.value.0, points: $0.value.1) }
            .sorted { $0.date > $1.date }
    }
}
