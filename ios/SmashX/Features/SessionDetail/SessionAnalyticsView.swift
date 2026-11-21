import SwiftUI

struct SessionAnalyticsView: View {
    @Environment(AppStore.self) private var store
    let session: Session

    var body: some View {
        let rows = Analytics.sessionStandings(session: session)
        VStack(alignment: .leading, spacing: 16) {
            cutout("Matches", "\(session.matches.count)")
            if let top = rows.first {
                cutout("Top player", store.player(top.id)?.name ?? "Player")
            }
            Text("Point swing")
                .font(SXFont.title(16))
                .textCase(.uppercase)
            ForEach(rows.prefix(5), id: \.id) { row in
                HStack {
                    Text(store.player(row.id)?.name ?? "Player")
                        .font(SXFont.body(13))
                    Spacer()
                    Text(row.points >= 0 ? "+\(row.points)" : "\(row.points)")
                        .font(SXFont.numeric(16).italic())
                        .foregroundStyle(row.points >= 0 ? SXColor.neon : Color.red)
                }
                .padding(.vertical, 8)
                .padding(.horizontal, 12)
                .background(
                    LinearGradient(colors: [SXColor.neon.opacity(0.1), .clear], startPoint: .leading, endPoint: .trailing)
                )
                .overlay(alignment: .leading) {
                    Rectangle().fill(SXColor.neon.opacity(0.5)).frame(width: 2)
                }
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
                .font(SXFont.title(22))
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SXColor.structure)
    }
}
