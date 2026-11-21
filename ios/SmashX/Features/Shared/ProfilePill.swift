import SwiftUI

/// Header identity block shown on every tab, mirrors components/Header.tsx.
struct ProfilePill: View {
    @Environment(AppStore.self) private var store

    private var rank: String {
        guard let user = store.activeUser else { return "-" }
        let sorted = store.users.sorted { $0.points > $1.points }
        guard let index = sorted.firstIndex(where: { $0.id == user.id }) else { return "-" }
        return "\(index + 1)"
    }

    var body: some View {
        NavigationLink {
            ProfileView()
        } label: {
            if let user = store.activeUser {
                HStack(spacing: 10) {
                    AvatarImage(urlString: user.avatar, size: 36)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Rank #\(rank)")
                            .font(SXFont.label(9).italic())
                            .tracking(1.6)
                            .textCase(.uppercase)
                            .foregroundStyle(SXColor.muted)
                        Text(user.name)
                            .font(SXFont.title(18))
                            .tracking(-0.5)
                            .lineLimit(1)
                    }
                }
            }
        }
    }
}
