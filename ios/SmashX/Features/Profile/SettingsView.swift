import SwiftUI

struct SettingsView: View {
    @Environment(AppStore.self) private var store
    @State private var name = ""
    @State private var options = AvatarOptions.random()
    @State private var confirmDelete = false
    @State private var didLoad = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                SXField(title: "Username", text: $name)
                    .textInputAutocapitalization(.never)
                AvatarForm(options: $options)
                SXButton(title: "Save") {
                    guard var user = store.activeUser else { return }
                    user.name = name.trimmingCharacters(in: .whitespaces)
                    user.avatar = options.storedURL()
                    Task { await store.updateProfile(user) }
                }
                SXButton(title: "Delete Account", kind: .danger) { confirmDelete = true }
            }
            .padding(20)
        }
        .arenaBackground()
        .hidesTabBar()
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            guard !didLoad, let user = store.activeUser else { return }
            didLoad = true
            name = user.name
        }
        .confirmationDialog("Delete your account? This cannot be undone.", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete Account", role: .destructive) {
                Task { await store.deleteAccount() }
            }
        }
    }
}
