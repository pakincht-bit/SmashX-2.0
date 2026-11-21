import SwiftUI

struct ShareReportView: View {
    @Environment(AppStore.self) private var store
    let session: Session
    @State private var image: Image?

    var body: some View {
        let card = reportCard
        ScrollView {
            VStack(spacing: 24) {
                card
                    .padding(20)
                    .background(SXColor.card)
                    .shadow(color: SXColor.neon.opacity(0.15), radius: 20)
                    .padding()
                if let image {
                    ShareLink(item: image, preview: SharePreview(session.displayTitle, image: image)) {
                        Text("Share")
                            .font(SXFont.label(12))
                            .textCase(.uppercase)
                            .tracking(2)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 16)
                            .background(SXColor.neon)
                            .foregroundStyle(SXColor.navyInk)
                            .skewEffect()
                    }
                    .padding(.horizontal, 20)
                }
            }
        }
        .arenaBackground()
        .navigationTitle("Share")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { render() }
    }

    private var reportCard: some View {
        let user = store.activeUser
        let rows = Analytics.sessionStandings(session: session)
        let mine = user.flatMap { player in rows.first(where: { $0.id == player.id }) }
        return VStack(alignment: .leading, spacing: 12) {
            Text("SmashX")
                .font(SXFont.label(10))
                .tracking(2)
                .foregroundStyle(SXColor.neon)
            Text(session.displayTitle)
                .font(SXFont.title(24))
                .textCase(.uppercase)
            Text(session.location)
                .font(SXFont.label(11))
                .tracking(1.4)
                .foregroundStyle(SXColor.muted)
            if let mine {
                HStack {
                    VStack(alignment: .leading) {
                        Text(user?.name ?? "You")
                            .font(SXFont.title(18))
                        Text("\(mine.wins)W \(mine.losses)L")
                            .font(SXFont.label(11))
                            .foregroundStyle(SXColor.muted)
                    }
                    Spacer()
                    Text(mine.points >= 0 ? "+\(mine.points)" : "\(mine.points)")
                        .font(SXFont.title(36))
                        .foregroundStyle(SXColor.neon)
                }
            }
            if let top = rows.first {
                Text("MVP  \(store.player(top.id)?.name ?? "Player")")
                    .font(SXFont.label(12))
                    .tracking(1.4)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
    }

    @MainActor
    private func render() {
        let renderer = ImageRenderer(content: reportCard.frame(width: 320).preferredColorScheme(.dark))
        renderer.scale = 3
        if let uiImage = renderer.uiImage {
            image = Image(uiImage: uiImage)
        }
    }
}
