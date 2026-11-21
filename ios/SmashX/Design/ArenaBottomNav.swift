import SwiftUI

struct SXSegmentedBar: View {
    var titles: [String]
    @Binding var index: Int

    var body: some View {
        HStack(spacing: 0) {
            ForEach(Array(titles.enumerated()), id: \.offset) { i, title in
                Button {
                    Haptics.play(.light)
                    index = i
                } label: {
                    Text(title)
                        .font(SXFont.label(11))
                        .textCase(.uppercase)
                        .tracking(1.4)
                        .foregroundStyle(index == i ? SXColor.navyInk : SXColor.muted)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(index == i ? SXColor.neon : SXColor.card)
                }
                .buttonStyle(.plain)
            }
        }
    }
}


/// Floating tab pill plus a separate round action button, the iOS 26 tab bar layout.
struct ArenaTabBar: View {
    @Binding var selection: AppTab
    var onAdd: () -> Void
    @Namespace private var highlight

    private let tabs: [AppTab] = [.sessions, .leaderboard, .groups]

    var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 0) {
                ForEach(tabs) { tab in
                    let active = selection == tab
                    Button {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) { selection = tab }
                    } label: {
                        VStack(spacing: 4) {
                            Image(systemName: tab.systemImage)
                                .font(.system(size: 20, weight: .semibold))
                            Text(tab.arenaLabel)
                                .font(.system(size: 10, weight: .semibold))
                        }
                        .foregroundStyle(active ? SXColor.neon : Color(white: 0.55))
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background {
                            if active {
                                Capsule()
                                    .fill(Color.white.opacity(0.10))
                                    .padding(4)
                                    .matchedGeometryEffect(id: "pill", in: highlight)
                            }
                        }
                        .contentShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .frame(height: 64)
            .barGlass(in: Capsule())

            Button(action: onAdd) {
                Image(systemName: "plus")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(SXColor.neon)
                    .frame(width: 64, height: 64)
                    .contentShape(Circle())
            }
            .buttonStyle(.plain)
            .barGlass(in: Circle())
            .accessibilityLabel("Create session")
        }
        .padding(.horizontal, 16)
        .padding(.bottom, 4)
    }
}

private extension View {
    @ViewBuilder
    func barGlass<S: InsettableShape>(in shape: S) -> some View {
        if #available(iOS 26.0, *) {
            self.glassEffect(.regular, in: shape)
        } else {
            self.background(.ultraThinMaterial, in: shape)
                .overlay(shape.strokeBorder(Color.white.opacity(0.1), lineWidth: 1))
        }
    }
}
