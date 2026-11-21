import SwiftUI

struct RootView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        Group {
            if store.isBooting {
                ZStack {
                    SXColor.base.ignoresSafeArea()
                    ProgressView("Loading")
                        .tint(SXColor.neon)
                        .font(SXFont.label(11))
                        .textCase(.uppercase)
                        .foregroundStyle(.white)
                }
            } else if store.isAuthenticated {
                MainTabView()
            } else {
                switch store.authRoute {
                case .welcome: WelcomeView()
                case .login: LoginView()
                case .register: RegisterView()
                }
            }
        }
        .overlay(alignment: .top) {
            if let toast = store.toast {
                ToastBanner(toast: toast)
                    .padding(.top, 8)
                    .transition(.move(edge: .top).combined(with: .opacity))
            }
        }
        .animation(.easeInOut, value: store.toast?.id)
        .alert("New rank", isPresented: Binding(
            get: { store.newTierName != nil },
            set: { if !$0 { store.newTierName = nil } }
        )) {
            Button("OK", role: .cancel) { store.newTierName = nil }
        } message: {
            Text(store.newTierName ?? "")
        }
    }
}
