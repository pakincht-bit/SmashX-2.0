import SwiftUI

struct GroupDetailView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let groupId: String

    @State private var showAdd = false
    @State private var renameText = ""
    @State private var showRename = false
    @State private var confirmDelete = false
    @State private var memberToRemove: Player?

    private var group: PlayerGroup? { store.groups.first { $0.id == groupId } }
    private var isOwner: Bool { group?.ownerId == store.activeUser?.id }

    var body: some View {
        Group {
            if let group {
                ScrollView {
                    LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 4), spacing: 16) {
                        ForEach(group.memberIds.compactMap { store.player($0) }) { member in
                            memberCell(member, group: group)
                        }
                    }
                    .padding(20)
                    .padding(.bottom, 80)
                }
                .safeAreaInset(edge: .bottom) {
                    if isOwner {
                        SXButton(title: "Add Members") { showAdd = true }
                            .padding(16)
                            .background(SXColor.base)
                    }
                }
                .navigationTitle(group.name)
                .toolbar {
                    if isOwner {
                        ToolbarItem(placement: .topBarTrailing) {
                            Menu {
                                Button("Edit group name", systemImage: "pencil") {
                                    renameText = group.name
                                    showRename = true
                                }
                                Button("Delete group", systemImage: "trash", role: .destructive) {
                                    confirmDelete = true
                                }
                            } label: {
                                Image(systemName: "ellipsis")
                            }
                        }
                    }
                }
                .sheet(isPresented: $showAdd) { AddMembersSheet(group: group) }
                .alert("Edit group name", isPresented: $showRename) {
                    TextField("Group name", text: $renameText)
                    Button("Save") { Task { await store.renameGroup(groupId: groupId, name: renameText) } }
                    Button("Cancel", role: .cancel) {}
                }
                .alert("Delete Group", isPresented: $confirmDelete) {
                    Button("Delete", role: .destructive) {
                        Task {
                            await store.deleteGroup(groupId)
                            dismiss()
                        }
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("Delete “\(group.name)” permanently?")
                }
                .alert("Remove Member", isPresented: Binding(get: { memberToRemove != nil }, set: { if !$0 { memberToRemove = nil } })) {
                    Button("Remove", role: .destructive) {
                        if let member = memberToRemove {
                            Task { await store.removeGroupMember(groupId: groupId, userId: member.id) }
                        }
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("Remove \(memberToRemove?.name ?? "") from \(group.name)?")
                }
            } else {
                Color.clear
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .arenaBackground()
        .hidesTabBar()
    }

    private func memberCell(_ member: Player, group: PlayerGroup) -> some View {
        let canRemove = isOwner && member.id != group.ownerId
        return Button {
            guard canRemove else { return }
            Haptics.play(.light)
            memberToRemove = member
        } label: {
            VStack(spacing: 4) {
                AvatarImage(urlString: member.avatar, size: 44)
                    .overlay(Circle().strokeBorder(SXColor.neon.opacity(0.4), lineWidth: 2))
                    .overlay(alignment: .topTrailing) {
                        if canRemove {
                            Image(systemName: "xmark")
                                .font(.system(size: 8, weight: .black))
                                .foregroundStyle(Color(white: 0.6))
                                .frame(width: 16, height: 16)
                                .background(SXColor.card)
                                .offset(x: 2, y: -2)
                        }
                    }
                    .overlay(alignment: .bottom) {
                        if member.id == group.ownerId {
                            Text("Owner")
                                .font(SXFont.label(7))
                                .textCase(.uppercase)
                                .tracking(1)
                                .foregroundStyle(SXColor.neon)
                                .padding(.horizontal, 3)
                                .background(SXColor.base)
                                .offset(y: 6)
                        }
                    }
                Text(member.name)
                    .font(SXFont.label(9))
                    .lineLimit(1)
                    .padding(.top, 4)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }
}

private struct AddMembersSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let group: PlayerGroup
    @State private var selected: Set<String> = []
    @State private var query = ""
    @State private var submitting = false

    private var candidates: [Player] {
        store.users
            .filter { !group.memberIds.contains($0.id) }
            .filter { query.isEmpty || $0.name.localizedCaseInsensitiveContains(query) }
            .sorted { $0.name.localizedCompare($1.name) == .orderedAscending }
    }

    var body: some View {
        NavigationStack {
            PlayerPicker(players: candidates, selected: $selected, query: $query,
                         emptyText: query.isEmpty ? "All players are already in this group" : "No players match your search")
                .safeAreaInset(edge: .bottom) {
                    SXButton(title: selected.isEmpty ? "Add" : "Add (\(selected.count))",
                             isLoading: submitting, enabled: !selected.isEmpty) {
                        submitting = true
                        Task {
                            await store.addGroupMembers(groupId: group.id, userIds: Array(selected))
                            dismiss()
                        }
                    }
                    .padding(16)
                    .background(SXColor.base)
                }
                .navigationTitle("Add Members")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                }
                .arenaBackground()
        }
        .preferredColorScheme(.dark)
    }
}

/// Searchable multi-select list shared by group creation and "add members".
struct PlayerPicker: View {
    let players: [Player]
    @Binding var selected: Set<String>
    @Binding var query: String
    var emptyText: String

    var body: some View {
        ScrollView {
            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass").foregroundStyle(SXColor.muted)
                    TextField("Search players...", text: $query)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                }
                .padding(12)
                .background(SXColor.card)
                .padding(.bottom, 4)

                if players.isEmpty {
                    Text(emptyText)
                        .font(SXFont.label(11))
                        .textCase(.uppercase)
                        .tracking(1.2)
                        .foregroundStyle(SXColor.muted)
                        .padding(.vertical, 48)
                }
                ForEach(players) { player in
                    let isOn = selected.contains(player.id)
                    Button {
                        Haptics.play(.light)
                        if isOn { selected.remove(player.id) } else { selected.insert(player.id) }
                    } label: {
                        HStack(spacing: 12) {
                            AvatarImage(urlString: player.avatar, size: 40)
                            Text(player.name).font(SXFont.body(14)).lineLimit(1)
                            Spacer()
                            Image(systemName: "checkmark")
                                .font(.system(size: 12, weight: .black))
                                .foregroundStyle(isOn ? SXColor.navyInk : .clear)
                                .frame(width: 24, height: 24)
                                .background(isOn ? SXColor.neon : .clear)
                                .overlay(Rectangle().strokeBorder(isOn ? SXColor.neon : SXColor.border, lineWidth: 1))
                        }
                        .padding(12)
                        .background(isOn ? SXColor.neon.opacity(0.1) : SXColor.card)
                        .overlay(Rectangle().strokeBorder(isOn ? SXColor.neon.opacity(0.5) : .clear, lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(16)
        }
    }
}
