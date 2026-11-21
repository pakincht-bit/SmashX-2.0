import SwiftUI

struct MainTabView: View {
    @Environment(AppStore.self) private var store
    @State private var showCreate = false

    init() {
        // Match the native tab bar to the SmashX dark navy theme.
        let appearance = UITabBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = UIColor(SXColor.base)
        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }

    var body: some View {
        @Bindable var store = store
        TabView(selection: $store.selectedTab) {
            Tab(AppTab.sessions.arenaLabel, systemImage: AppTab.sessions.systemImage, value: AppTab.sessions) {
                SessionsView()
                    .toolbarVisibility(.hidden, for: .tabBar)
            }
            Tab(AppTab.leaderboard.arenaLabel, systemImage: AppTab.leaderboard.systemImage, value: AppTab.leaderboard) {
                LeaderboardView()
                    .toolbarVisibility(.hidden, for: .tabBar)
            }
            Tab(AppTab.groups.arenaLabel, systemImage: AppTab.groups.systemImage, value: AppTab.groups) {
                GroupsView()
                    .toolbarVisibility(.hidden, for: .tabBar)
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if store.tabBarHiddenCount == 0 {
                ArenaTabBar(selection: $store.selectedTab) {
                    Haptics.play(.medium)
                    showCreate = true
                }
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .animation(.easeInOut(duration: 0.2), value: store.tabBarHiddenCount)
        .tint(SXColor.neon)
        .onChange(of: store.selectedTab) { _, _ in
            Haptics.play(.light)
        }
        .sheet(isPresented: $showCreate) {
            CreateSessionView(editing: nil)
        }
        .overlay {
            if store.isSyncing {
                ProgressView("Updating rankings")
                    .font(SXFont.label(11))
                    .textCase(.uppercase)
                    .tracking(1.4)
                    .tint(SXColor.neon)
                    .padding(20)
                    .background(SXColor.card)
                    .foregroundStyle(.white)
            }
        }
    }
}
