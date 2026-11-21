import SwiftUI

struct SessionCardView: View {
    @Environment(AppStore.self) private var store
    let session: Session
    var compact: Bool = false

    var body: some View {
        let phase = SessionLifecycle.phase(for: session)
        let parts = SXDate.parts(session.startTime)

        VStack(alignment: .leading, spacing: 0) {
            ZStack(alignment: .bottomLeading) {
                LinearGradient(
                    colors: [SXColor.border, SXColor.base],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                bouncingAvatars
                if phase == .playing {
                    liveBadge
                        .padding(12)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                } else if phase == .ended {
                    endedBadge
                        .padding(12)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                }
                HStack(alignment: .bottom, spacing: 10) {
                    Text(parts.day)
                        .font(SXFont.title(compact ? 40 : 64))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(parts.month)
                            .font(SXFont.title(compact ? 14 : 18))
                            .foregroundStyle(SXColor.neon)
                        Text(parts.weekday)
                            .font(SXFont.label(10))
                            .tracking(1.6)
                            .foregroundStyle(Color.white.opacity(0.7))
                    }
                    .padding(.bottom, 6)
                }
                .padding(16)
            }
            .frame(minHeight: compact ? 120 : 160)

            VStack(alignment: .leading, spacing: 14) {
                Text(session.displayTitle)
                    .font(SXFont.title(compact ? 18 : 22))
                    .textCase(.uppercase)
                    .lineLimit(1)
                Text(session.location)
                    .font(SXFont.label(11))
                    .textCase(.uppercase)
                    .tracking(1.6)
                    .foregroundStyle(SXColor.muted)
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Time")
                            .font(SXFont.label(9))
                            .tracking(1.6)
                            .foregroundStyle(SXColor.muted)
                        Text(SXDate.range(session.startTime, session.endTime))
                            .font(SXFont.title(16))
                    }
                    Spacer()
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Players")
                            .font(SXFont.label(9))
                            .tracking(1.6)
                            .foregroundStyle(SXColor.muted)
                        Text("\(session.playerIds.count)")
                            .font(SXFont.title(18))
                    }
                }
                .padding(.top, 8)
                .overlay(alignment: .top) {
                    Rectangle().fill(Color.white.opacity(0.05)).frame(height: 1)
                }
            }
            .padding(20)
            .background(SXColor.panel)
        }
        .background(SXColor.banner)
        .shadow(color: .black.opacity(0.5), radius: 16, y: 8)
    }

    private var liveBadge: some View {
        HStack(spacing: 6) {
            Circle().fill(.white).frame(width: 6, height: 6)
            Text("Live")
                .font(SXFont.label(11))
                .textCase(.uppercase)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.red)
        .foregroundStyle(.white)
        .clipShape(Capsule())
    }

    private var endedBadge: some View {
        Text("Ended")
            .font(SXFont.label(11))
            .textCase(.uppercase)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(Color.black.opacity(0.7))
            .foregroundStyle(SXColor.muted)
            .clipShape(Capsule())
    }

    private var bouncingAvatars: some View {
        let ids = Array(session.playerIds.prefix(5))
        let offsets: [(CGFloat, CGFloat, CGFloat)] = [
            (0.82, 0.18, 40),
            (0.68, 0.38, 48),
            (0.55, 0.14, 32),
            (0.78, 0.62, 40),
            (0.58, 0.58, 36)
        ]
        return GeometryReader { geo in
            ForEach(Array(ids.enumerated()), id: \.element) { index, id in
                let conf = offsets[index]
                AvatarImage(urlString: store.player(id)?.avatar ?? Avatar.defaultURL(seed: id), size: conf.2)
                    .overlay(Circle().stroke(SXColor.base, lineWidth: 2))
                    .position(x: geo.size.width * conf.0, y: geo.size.height * conf.1)
                    .bounceAvatar(index: index)
            }
        }
        .allowsHitTesting(false)
    }
}

private struct BounceAvatar: ViewModifier {
    let index: Int
    @State private var up = false

    func body(content: Content) -> some View {
        content
            .offset(y: up ? -6 : 6)
            .animation(
                .easeInOut(duration: 1.6 + Double(index) * 0.15)
                .repeatForever(autoreverses: true)
                .delay(Double(index) * 0.2),
                value: up
            )
            .onAppear { up = true }
    }
}

private extension View {
    func bounceAvatar(index: Int) -> some View {
        modifier(BounceAvatar(index: index))
    }
}
