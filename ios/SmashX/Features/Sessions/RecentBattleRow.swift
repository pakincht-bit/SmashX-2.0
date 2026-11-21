import SwiftUI

/// Compact history row, mirrors the "Recent Battles" list on the mobile web app.
struct RecentBattleRow: View {
    let session: Session

    var body: some View {
        let parts = SXDate.parts(session.startTime)
        HStack(spacing: 16) {
            VStack(spacing: 4) {
                Text(parts.month)
                    .font(SXFont.label(9))
                    .tracking(1.6)
                    .foregroundStyle(SXColor.muted)
                Text(parts.day)
                    .font(SXFont.label(20))
                    .tracking(-0.8)
                    .foregroundStyle(.white)
            }
            .frame(minWidth: 40)
            .padding(.vertical, 6)
            .background(SXColor.base)

            VStack(alignment: .leading, spacing: 4) {
                Text(session.displayTitle)
                    .font(SXFont.label(14))
                    .textCase(.uppercase)
                    .tracking(-0.3)
                    .lineLimit(1)
                    .foregroundStyle(.white)
                HStack(spacing: 8) {
                    Text(SXDate.time(session.startTime))
                        .monospacedDigit()
                    Text("•").opacity(0.3)
                    Text(session.location).lineLimit(1)
                }
                .font(SXFont.label(10))
                .textCase(.uppercase)
                .tracking(1)
                .foregroundStyle(Color(white: 0.62))
            }
            Spacer(minLength: 0)
        }
        .padding(12)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(SXColor.card)
        .contentShape(Rectangle())
    }
}
