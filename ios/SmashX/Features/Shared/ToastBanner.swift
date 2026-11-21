import SwiftUI

struct ToastBanner: View {
    let toast: Toast

    var body: some View {
        Text(toast.message)
            .font(SXFont.label(11))
            .textCase(.uppercase)
            .tracking(1.6)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(toast.isError ? Color.red.opacity(0.9) : SXColor.neon)
            .foregroundStyle(toast.isError ? .white : SXColor.navyInk)
    }
}
