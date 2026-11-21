import SwiftUI

struct GroupsView: View {
    @Environment(AppStore.self) private var store
    @State private var showCreate = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    HStack {
                        SXSectionTitle(text: "Player", accent: "Groups")
                        Button {
                            Haptics.play(.medium)
                            showCreate = true
                        } label: {
                            Label("New", systemImage: "plus")
                                .font(SXFont.label(11))
                                .textCase(.uppercase)
                                .tracking(1.4)
                                .foregroundStyle(SXColor.neon)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(SXColor.card)
                                .overlay(Rectangle().strokeBorder(SXColor.neon.opacity(0.3), lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                    }

                    if store.groups.isEmpty {
                        Button {
                            Haptics.play(.light)
                            showCreate = true
                        } label: {
                            VStack(spacing: 12) {
                                Image(systemName: "person.3")
                                    .font(.system(size: 28))
                                    .foregroundStyle(SXColor.neon.opacity(0.6))
                                Text("Create Your Crew")
                                    .font(SXFont.label(14))
                                    .textCase(.uppercase)
                                    .tracking(1)
                                Text("Group friends, invite together, track group ranks")
                                    .font(SXFont.label(10))
                                    .textCase(.uppercase)
                                    .tracking(1.4)
                                    .foregroundStyle(SXColor.muted)
                                    .multilineTextAlignment(.center)
                            }
                            .padding(.vertical, 40)
                            .padding(.horizontal, 24)
                            .frame(maxWidth: .infinity)
                            .background(SXColor.structure)
                        }
                        .buttonStyle(.plain)
                    } else {
                        VStack(spacing: 12) {
                            ForEach(store.groups) { group in
                                NavigationLink(value: group.id) {
                                    GroupRowView(group: group)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 12)
                .padding(.bottom, 24)
            }
            .refreshable { await store.fetchGroups() }
            .arenaBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .topBarLeading) { ProfilePill() } }
            .navigationDestination(for: String.self) { id in
                GroupDetailView(groupId: id)
            }
            .sheet(isPresented: $showCreate) {
                CreateGroupView()
            }
        }
    }
}

private struct GroupRowView: View {
    @Environment(AppStore.self) private var store
    let group: PlayerGroup

    var body: some View {
        let preview = group.memberIds.compactMap { store.player($0) }.prefix(4)
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 4) {
                Text(group.name)
                    .font(SXFont.title(16))
                    .textCase(.uppercase)
                    .lineLimit(1)
                Text("\(group.memberIds.count) players")
                    .font(SXFont.label(10))
                    .textCase(.uppercase)
                    .tracking(1.4)
                    .foregroundStyle(SXColor.muted)
                    .monospacedDigit()
            }
            Spacer(minLength: 0)
            HStack(spacing: -8) {
                ForEach(Array(preview)) { member in
                    AvatarImage(urlString: member.avatar, size: 36)
                        .overlay(Circle().strokeBorder(SXColor.card, lineWidth: 2))
                }
                if group.memberIds.count > 4 {
                    Text("+\(group.memberIds.count - 4)")
                        .font(SXFont.label(10))
                        .foregroundStyle(Color(white: 0.6))
                        .frame(width: 36, height: 36)
                        .background(SXColor.base, in: Circle())
                        .overlay(Circle().strokeBorder(SXColor.card, lineWidth: 2))
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SXColor.card)
        .contentShape(Rectangle())
    }
}
