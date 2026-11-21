import SwiftUI

struct LoginView: View {
    @Environment(AppStore.self) private var store
    @State private var username = ""
    @State private var password = ""
    @State private var error: String?
    @State private var isWorking = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(alignment: .leading, spacing: 6) {
                        (Text("Welcome ") + Text("Back").foregroundColor(SXColor.neon))
                            .font(SXFont.title(32))
                            .textCase(.uppercase)
                        Text("Enter your credentials to continue")
                            .font(SXFont.label(10))
                            .textCase(.uppercase)
                            .tracking(1.6)
                            .foregroundStyle(SXColor.muted)
                    }
                    .padding(.top, 24)

                    SXField(title: "Username", text: $username, placeholder: "e.g. Alex")
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                    SXField(title: "Password", text: $password, isSecure: true, placeholder: "••••••••")

                    if let error {
                        Text(error)
                            .font(SXFont.label(10))
                            .foregroundStyle(.red)
                    }

                    SXButton(
                        title: isWorking ? "Logging in…" : "Login",
                        isLoading: isWorking,
                        enabled: !username.trimmingCharacters(in: .whitespaces).isEmpty && !password.isEmpty
                    ) {
                        Task { await submit() }
                    }
                }
                .padding(24)
            }
            .arenaBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        store.authRoute = .welcome
                    } label: {
                        Image(systemName: "chevron.left")
                            .foregroundStyle(SXColor.muted)
                    }
                }
            }
        }
    }

    private func submit() async {
        isWorking = true
        error = nil
        do {
            try await store.login(username: username, password: password)
        } catch {
            self.error = error.localizedDescription
        }
        isWorking = false
    }
}
