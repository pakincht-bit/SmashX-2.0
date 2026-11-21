import SwiftUI

private struct HidesTabBarModifier: ViewModifier {
    @Environment(AppStore.self) private var store

    func body(content: Content) -> some View {
        content
            .onAppear { store.tabBarHiddenCount += 1 }
            .onDisappear { store.tabBarHiddenCount = max(0, store.tabBarHiddenCount - 1) }
    }
}

extension View {
    /// Hides the floating tab bar while this pushed screen is visible.
    func hidesTabBar() -> some View { modifier(HidesTabBarModifier()) }
}
