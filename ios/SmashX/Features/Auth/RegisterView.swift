import SwiftUI

struct RegisterView: View {
    @Environment(AppStore.self) private var store
    @State private var step = 1
    @State private var username = ""
    @State private var password = ""
    @State private var options = AvatarOptions.random()
    @State private var error: String?
    @State private var isWorking = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    HStack(spacing: 6) {
                        ForEach(1...3, id: \.self) { i in
                            Capsule()
                                .fill(i <= step ? SXColor.neon : Color.gray.opacity(0.35))
                                .frame(width: i <= step ? 32 : 8, height: 6)
                        }
                    }
                    .padding(.top, 8)

                    Text(title)
                        .font(SXFont.title(28))
                        .textCase(.uppercase)

                    if step == 1 {
                        SXField(title: "Username", text: $username, placeholder: "e.g. BadmintonKing")
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        Text("* Only English characters allowed")
                            .font(SXFont.label(10))
                            .foregroundStyle(SXColor.muted)
                    } else if step == 2 {
                        SXField(title: "Password", text: $password, isSecure: true, placeholder: "••••••••")
                        Text("* Minimum 6 characters")
                            .font(SXFont.label(10))
                            .foregroundStyle(password.count > 0 && password.count < 6 ? .red : SXColor.muted)
                    } else {
                        AvatarForm(options: $options)
                    }

                    if let error {
                        Text(error)
                            .font(SXFont.label(10))
                            .foregroundStyle(.red)
                    }

                    SXButton(
                        title: actionLabel,
                        isLoading: isWorking,
                        enabled: canAdvance
                    ) {
                        Task { await advance() }
                    }
                }
                .padding(24)
            }
            .arenaBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        if step == 1 { store.authRoute = .welcome }
                        else { step -= 1 }
                    } label: {
                        Image(systemName: "chevron.left")
                            .foregroundStyle(SXColor.muted)
                    }
                }
            }
        }
    }

    private var title: String {
        switch step {
        case 1: return "Create Username"
        case 2: return "Create Password"
        default: return "Avatar"
        }
    }

    private var actionLabel: String {
        if isWorking { return step == 1 ? "Checking…" : "Creating…" }
        return step == 3 ? "Get Started" : "Continue"
    }

    private var canAdvance: Bool {
        switch step {
        case 1: return !username.trimmingCharacters(in: .whitespaces).isEmpty
        case 2: return password.count >= 6
        default: return true
        }
    }

    private func advance() async {
        error = nil
        if step == 1 {
            let name = username.trimmingCharacters(in: .whitespaces)
            guard AuthIdentity.isValidUsername(name) else {
                error = "Only English letters, numbers, and spaces are allowed."
                return
            }
            isWorking = true
            do {
                if try await store.isUsernameAvailable(name) {
                    step = 2
                } else {
                    error = "This username is already taken."
                }
            } catch {
                self.error = error.localizedDescription
            }
            isWorking = false
        } else if step == 2 {
            step = 3
        } else {
            isWorking = true
            do {
                try await store.register(username: username, password: password, avatarURL: options.storedURL())
            } catch {
                self.error = error.localizedDescription
            }
            isWorking = false
        }
    }
}

struct AvatarForm: View {
    @Binding var options: AvatarOptions

    var body: some View {
        VStack(spacing: 16) {
            AvatarImage(urlString: options.storedURL(), size: 96)
            SXButton(title: "Randomize", kind: .outline) {
                options = .random()
            }
            avatarPicker("Face", AvatarOptions.seeds, $options.seed)
            avatarPicker("Hair", AvatarOptions.hairStyles, $options.hair)
            avatarPicker("Hair color", AvatarOptions.hairColors, $options.hairColor)
            avatarPicker("Skin", AvatarOptions.skinColors, $options.skinColor)
            avatarPicker("Eyes", AvatarOptions.eyes, $options.eyes)
            avatarPicker("Background", AvatarOptions.backgrounds, $options.backgroundColor)
        }
    }

    private func avatarPicker(_ title: String, _ values: [String], _ selection: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(SXFont.label(10))
                .textCase(.uppercase)
                .tracking(1.6)
                .foregroundStyle(SXColor.neon)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(values, id: \.self) { value in
                        Button {
                            selection.wrappedValue = value
                        } label: {
                            Text(value)
                                .font(SXFont.label(10))
                                .padding(.horizontal, 10)
                                .padding(.vertical, 8)
                                .background(selection.wrappedValue == value ? SXColor.neon : SXColor.card)
                                .foregroundStyle(selection.wrappedValue == value ? SXColor.navyInk : .white)
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }
}
