import SwiftUI

struct CreateGroupView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var step = 1
    @State private var selected: Set<String> = []
    @State private var query = ""
    @State private var name = ""
    @State private var submitting = false

    private var candidates: [Player] {
        store.users
            .filter { $0.id != store.activeUser?.id }
            .filter { query.isEmpty || $0.name.localizedCaseInsensitiveContains(query) }
            .sorted { $0.name.localizedCompare($1.name) == .orderedAscending }
    }

    private var chosen: [Player] {
        store.users.filter { selected.contains($0.id) }
    }

    var body: some View {
        NavigationStack {
            Group {
                if step == 1 {
                    PlayerPicker(players: candidates, selected: $selected, query: $query,
                                 emptyText: store.users.count <= 1 ? "No other players available yet" : "No players match your search")
                } else {
                    nameStep
                }
            }
            .safeAreaInset(edge: .bottom) {
                Group {
                    if step == 1 {
                        SXButton(title: "Next — Name Group", enabled: !selected.isEmpty) {
                            withAnimation { step = 2 }
                        }
                    } else {
                        SXButton(title: "Create Group", isLoading: submitting,
                                 enabled: !name.trimmingCharacters(in: .whitespaces).isEmpty) {
                            submitting = true
                            Task {
                                let ok = await store.createGroup(name: name, memberIds: Array(selected))
                                submitting = false
                                if ok { dismiss() }
                            }
                        }
                    }
                }
                .padding(16)
                .background(SXColor.base)
            }
            .navigationTitle(step == 1 ? "Add Members" : "Name Group")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if step == 2 {
                        Button("Back") { withAnimation { step = 1 } }
                    } else {
                        Button("Cancel") { dismiss() }
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Text("\(step)/2")
                        .font(SXFont.label(10))
                        .foregroundStyle(SXColor.muted)
                }
            }
            .arenaBackground()
        }
        .preferredColorScheme(.dark)
    }

    private var nameStep: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    Text("Group Name")
                        .font(SXFont.label(10))
                        .textCase(.uppercase)
                        .tracking(1.6)
                        .foregroundStyle(SXColor.muted)
                    TextField("Tuesday Crew", text: $name)
                        .font(SXFont.body(16))
                        .padding(14)
                        .background(SXColor.card)
                        .overlay(Rectangle().strokeBorder(SXColor.border, lineWidth: 1))
                }
                HStack {
                    Text("Selected members")
                        .font(SXFont.label(10))
                        .textCase(.uppercase)
                        .tracking(1.6)
                        .foregroundStyle(SXColor.muted)
                    Spacer()
                    Text("\(chosen.count + 1)")
                        .font(SXFont.label(10))
                        .foregroundStyle(SXColor.neon)
                }
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 4), spacing: 16) {
                    ForEach(([store.activeUser].compactMap { $0 }) + chosen) { member in
                        VStack(spacing: 4) {
                            AvatarImage(urlString: member.avatar, size: 44)
                                .overlay(Circle().strokeBorder(SXColor.neon.opacity(0.4), lineWidth: 2))
                            Text(member.id == store.activeUser?.id ? "You" : member.name)
                                .font(SXFont.label(9))
                                .lineLimit(1)
                        }
                    }
                }
            }
            .padding(20)
        }
    }
}
