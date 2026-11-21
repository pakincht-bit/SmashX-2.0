import SwiftUI

struct SessionsView: View {
    @Environment(AppStore.self) private var store

    var body: some View {
        @Bindable var store = store
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    if !store.network.isOnline {
                        statusBanner("Offline — pull to refresh when you reconnect", icon: "wifi.slash")
                    } else if store.connectionStatus != "live" {
                        statusBanner("Reconnecting…", icon: "antenna.radiowaves.left.and.right")
                    }

                    SXSectionTitle(text: "Upcoming", accent: "Sessions")
                        .padding(.horizontal, 20)

                    if store.upcomingSessions.isEmpty {
                        Text("No upcoming sessions")
                            .font(SXFont.label(11))
                            .textCase(.uppercase)
                            .foregroundStyle(SXColor.muted)
                            .padding(.horizontal, 20)
                    } else {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 16) {
                                ForEach(store.upcomingSessions) { session in
                                    NavigationLink(value: session.id) {
                                        SessionCardView(session: session)
                                            .frame(width: 300)
                                    }
                                    .buttonStyle(.plain)
                                }
                                Color.clear.frame(width: 1)
                            }
                            .padding(.horizontal, 20)
                            .scrollTargetLayout()
                        }
                        .scrollTargetBehavior(.viewAligned)
                    }

                    if !store.recentSessions.isEmpty {
                        SXSectionTitle(text: "Recent", accent: "Battles", size: 14)
                            .padding(.horizontal, 20)
                            .padding(.bottom, -12)
                        VStack(spacing: 8) {
                            ForEach(store.recentSessions) { session in
                                NavigationLink(value: session.id) {
                                    RecentBattleRow(session: session)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal, 20)
                    }
                }
                .padding(.top, 12)
                .padding(.bottom, 96)
            }
            .refreshable { await store.refresh() }
            .arenaBackground()
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) { ProfilePill() }
            }
            .navigationDestination(for: String.self) { id in
                SessionDetailView(sessionId: id)
            }
            .overlay {
                if let error = store.fetchError, store.sessions.isEmpty {
                    VStack(spacing: 16) {
                        Text("Couldn’t load sessions")
                            .font(SXFont.title(18))
                        Text(error)
                            .font(SXFont.body(12))
                            .foregroundStyle(SXColor.muted)
                        SXButton(title: "Retry") {
                            Task { await store.refresh() }
                        }
                    }
                    .padding(24)
                }
            }
        }
    }

    private func statusBanner(_ text: String, icon: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
            Text(text)
                .font(SXFont.label(10))
                .textCase(.uppercase)
                .tracking(1.2)
        }
        .foregroundStyle(SXColor.neon)
        .padding(.horizontal, 20)
    }
}
