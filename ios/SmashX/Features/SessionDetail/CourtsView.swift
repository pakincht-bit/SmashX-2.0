import SwiftUI

struct CourtsView: View {
    @Environment(AppStore.self) private var store
    let session: Session
    let isHost: Bool

    @State private var assigningCourt: Int?
    @State private var recordingCourt: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            ForEach(0..<session.courtCount, id: \.self) { index in
                let assigned = session.courtAssignments[String(index)] ?? []
                Button {
                    Haptics.play(.light)
                    if assigned.isEmpty { assigningCourt = index }
                    else { recordingCourt = index }
                } label: {
                    courtCard(index: index, assigned: assigned)
                }
                .buttonStyle(.plain)
            }
            if isHost {
                SXButton(title: "Add Court", kind: .outline) {
                    Task { await store.addCourt(session.id) }
                }
            }
        }
        .sheet(item: courtItem($assigningCourt)) { item in
            AssignCourtSheet(session: session, courtIndex: item.value)
        }
        .sheet(item: courtItem($recordingCourt)) { item in
            RecordResultSheet(session: session, courtIndex: item.value)
        }
    }

    private func courtCard(index: Int, assigned: [String]) -> some View {
        let mid = Int(ceil(Double(max(assigned.count, 1)) / 2))
        return VStack(alignment: .leading, spacing: 12) {
            Text("Court \(index + 1)")
                .font(SXFont.title(16))
                .textCase(.uppercase)
            if assigned.isEmpty {
                Text("Tap to assign four players")
                    .font(SXFont.label(10))
                    .tracking(1.4)
                    .foregroundStyle(SXColor.muted)
            } else {
                HStack(alignment: .top) {
                    teamColumn(ids: Array(assigned.prefix(mid)), title: "Blue", color: .blue)
                    Spacer()
                    Text("VS")
                        .font(SXFont.label(12))
                        .foregroundStyle(SXColor.muted)
                    Spacer()
                    teamColumn(ids: Array(assigned.suffix(from: min(mid, assigned.count))), title: "Red", color: .red)
                }
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SXColor.card)
    }

    private func teamColumn(ids: [String], title: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title)
                .font(SXFont.label(10))
                .tracking(1.6)
                .foregroundStyle(color)
            ForEach(ids, id: \.self) { id in
                HStack(spacing: 8) {
                    AvatarImage(urlString: store.player(id)?.avatar ?? Avatar.defaultURL(seed: id), size: 22)
                    Text(store.player(id)?.name ?? "Player")
                        .font(SXFont.body(12))
                }
            }
        }
    }
}

private struct CourtItem: Identifiable {
    var id: Int { value }
    let value: Int
}

private func courtItem(_ binding: Binding<Int?>) -> Binding<CourtItem?> {
    Binding(
        get: { binding.wrappedValue.map(CourtItem.init) },
        set: { binding.wrappedValue = $0?.value }
    )
}
