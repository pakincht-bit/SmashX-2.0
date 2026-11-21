import SwiftUI

struct WelcomeView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()
                Text("SX")
                    .font(SXFont.title(64))
                    .foregroundStyle(SXColor.neon)
                    .shadow(color: SXColor.neon.opacity(0.4), radius: 20)
                Text("SmashX")
                    .font(SXFont.title(36))
                    .textCase(.uppercase)
                Text("Organize sessions, keep score, and track rankings with your group.")
                    .font(SXFont.body(13))
                    .textCase(.uppercase)
                    .tracking(1.2)
                    .foregroundStyle(SXColor.muted)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 32)
                Spacer()
                SXButton(title: "Log In") {
                    store.authRoute = .login
                }
                SXButton(title: "Create Account", kind: .outline) {
                    store.authRoute = .register
                }
            }
            .padding(24)
            .arenaBackground()
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}
