import SwiftUI

struct AssignCourtSheet: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    let session: Session
    let courtIndex: Int

    @State private var selected: [String] = []

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("Selected \(selected.count)/4")
                        .font(SXFont.label(10))
                        .tracking(1.6)
                        .foregroundStyle(SXColor.neon)
                    if selected.isEmpty {
                        Text("Pick four players")
                            .font(SXFont.body(13))
                            .foregroundStyle(SXColor.muted)
                    } else {
                        ForEach(selected, id: \.self, content: playerRow)
                    }

                    Text("Available")
                        .font(SXFont.title(16))
                        .textCase(.uppercase)
                        .padding(.top, 8)
                    ForEach(available, id: \.self) { id in
                        Button {
                            if selected.contains(id) {
                                selected.removeAll { $0 == id }
                            } else if selected.count < 4 {
                                selected.append(id)
                            }
                        } label: {
                            HStack {
                                playerRow(id)
                                Spacer()
                                if selected.contains(id) {
                                    Image(systemName: "checkmark")
                                        .foregroundStyle(SXColor.neon)
                                }
                            }
                            .padding(12)
                            .background(SXColor.card)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(20)
            }
            .arenaBackground()
            .navigationTitle("Court \(courtIndex + 1)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }.foregroundStyle(SXColor.muted)
                }
                ToolbarItem(placement: .primaryAction) {
                    Button("Random") { randomize() }.foregroundStyle(SXColor.neon)
                }
            }
            .safeAreaInset(edge: .bottom) {
                SXButton(title: "Start", enabled: selected.count == 4) {
                    Task {
                        await store.assignCourt(sessionId: session.id, courtIndex: courtIndex, playerIds: selected)
                        dismiss()
                    }
                }
                .padding(20)
                .background(SXColor.base)
            }
        }
        .preferredColorScheme(.dark)
    }

    private var available: [String] {
        let occupied = Set(
            session.courtAssignments
                .filter { $0.key != String(courtIndex) }
                .flatMap(\.value)
        )
        return session.checkedInPlayerIds.filter { !occupied.contains($0) }
    }

    private func randomize() {
        selected = Array(available.shuffled().prefix(4))
    }

    private func playerRow(_ id: String) -> some View {
        HStack {
            AvatarImage(urlString: store.player(id)?.avatar ?? Avatar.defaultURL(seed: id), size: 28)
            VStack(alignment: .leading) {
                Text(store.player(id)?.name ?? "Player")
                    .font(SXFont.body(14))
                Text("\(store.player(id)?.points ?? 1000) RP")
                    .font(SXFont.label(10))
                    .foregroundStyle(SXColor.muted)
            }
        }
    }
}
