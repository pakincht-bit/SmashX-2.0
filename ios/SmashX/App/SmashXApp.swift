import SwiftUI

@main
struct SmashXApp: App {
    @State private var store = AppStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .preferredColorScheme(.dark)
                .tint(SXColor.neon)
                .task { store.start() }
                .onChange(of: scenePhase) { _, phase in
                    if phase == .active {
                        store.handleSceneActive()
                    }
                }
        }
    }

    init() {
        SmashXAppearance.apply()
    }
}
