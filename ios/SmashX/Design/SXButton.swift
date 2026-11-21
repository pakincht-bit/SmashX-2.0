import SwiftUI

enum SXButtonKind {
    case primary, outline, danger, ghost
}

struct SXButton: View {
    var title: String
    var kind: SXButtonKind = .primary
    var isLoading: Bool = false
    var enabled: Bool = true
    var action: () -> Void

    var body: some View {
        Button(action: {
            guard enabled, !isLoading else { return }
            Haptics.play(.light)
            action()
        }) {
            HStack(spacing: 8) {
                if isLoading {
                    ProgressView()
                        .tint(kind == .primary ? SXColor.navyInk : SXColor.neon)
                }
                Text(title)
                    .font(SXFont.label(12))
                    .textCase(.uppercase)
                    .tracking(2)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(background)
            .foregroundStyle(foreground)
            .overlay(
                Rectangle()
                    .stroke(border, lineWidth: 1)
            )
            .skewEffect()
        }
        .buttonStyle(.plain)
        .opacity(enabled ? 1 : 0.45)
        .scaleEffect(1)
    }

    private var background: Color {
        switch kind {
        case .primary: return SXColor.neon
        case .outline, .ghost: return .clear
        case .danger: return Color.red.opacity(0.12)
        }
    }

    private var foreground: Color {
        switch kind {
        case .primary: return SXColor.navyInk
        case .outline, .ghost: return SXColor.muted
        case .danger: return Color.red.opacity(0.9)
        }
    }

    private var border: Color {
        switch kind {
        case .primary: return SXColor.neon
        case .outline: return SXColor.border
        case .danger: return Color.red.opacity(0.4)
        case .ghost: return .clear
        }
    }
}

private struct SkewEffect: ViewModifier {
    func body(content: Content) -> some View {
        content
            .clipShape(Rectangle())
            .transformEffect(CGAffineTransform(a: 1, b: 0, c: -0.2, d: 1, tx: 0, ty: 0))
    }
}

extension View {
    func skewEffect() -> some View {
        modifier(SkewEffect())
    }
}
