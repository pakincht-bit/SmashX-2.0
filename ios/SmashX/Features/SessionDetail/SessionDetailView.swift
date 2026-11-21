import SwiftUI

struct SessionDetailView: View {
    @Environment(AppStore.self) private var store
    let sessionId: String

    @State private var liveTab = 0
    @State private var endedTab = 0
    @State private var showEdit = false
    @State private var confirmEnd = false
    @State private var confirmDelete = false
    @State private var confirmLeave = false
    @State private var loaded: Session?

    var session: Session? {
        store.session(id: sessionId) ?? loaded
    }

    var body: some View {
        Group {
            if let session {
                content(session)
            } else {
                ProgressView().tint(SXColor.neon)
                    .task { loaded = await store.fetchSession(id: sessionId) }
            }
        }
        .arenaBackground()
        .hidesTabBar()
    }

    @ViewBuilder
    private func content(_ session: Session) -> some View {
        let phase = SessionLifecycle.phase(for: session)
        let isHost = session.isHost(store.activeUser?.id)
        let isJoined = session.isJoined(store.activeUser?.id)

        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                VStack(alignment: .leading, spacing: 8) {
                    Text(session.location.uppercased())
                        .font(SXFont.label(10))
                        .tracking(1.8)
                        .foregroundStyle(SXColor.muted)
                    Text(whenLabel(session))
                        .font(SXFont.title(16))
                    Text("\(session.courtCount) courts · \(session.playerIds.count) players")
                        .font(SXFont.label(10))
                        .tracking(1.4)
                        .foregroundStyle(SXColor.muted)
                }

                switch phase {
                case .open:
                    PlayersView(session: session, isHost: isHost)
                case .playing:
                    SXSegmentedBar(titles: ["Court", "Players", "History"], index: $liveTab)
                    switch liveTab {
                    case 1: PlayersView(session: session, isHost: isHost)
                    case 2: MatchHistoryView(session: session, isHost: isHost, canUndo: true)
                    default: CourtsView(session: session, isHost: isHost)
                    }
                case .ended:
                    SXSegmentedBar(titles: ["Scoreboard", "Stats", "History"], index: $endedTab)
                    switch endedTab {
                    case 1: SessionAnalyticsView(session: session)
                    case 2: MatchHistoryView(session: session, isHost: isHost, canUndo: false)
                    default: ScoreboardView(session: session)
                    }
                }
            }
            .padding(20)
            .padding(.bottom, 88)
        }
        .navigationTitle(session.displayTitle)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if isHost && phase == .open {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Edit") { showEdit = true }
                        .font(SXFont.label(11))
                        .foregroundStyle(SXColor.neon)
                }
            }
            if isHost && phase == .playing {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("End") { confirmEnd = true }
                        .font(SXFont.label(11))
                        .foregroundStyle(.red)
                }
            }
            if !isHost && isJoined && phase != .ended {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Leave") { confirmLeave = true }
                        .font(SXFont.label(11))
                        .foregroundStyle(.red)
                }
            }
        }
        .safeAreaInset(edge: .bottom) {
            bottomBar(session: session, phase: phase, isHost: isHost, isJoined: isJoined)
        }
        .sheet(isPresented: $showEdit) {
            CreateSessionView(editing: session)
        }
        .confirmationDialog("End this session?", isPresented: $confirmEnd, titleVisibility: .visible) {
            Button("End Session", role: .destructive) {
                Task { await store.endSession(session.id) }
            }
        }
        .confirmationDialog("Delete this session?", isPresented: $confirmDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive) {
                Task { await store.deleteSession(session.id) }
            }
        }
        .confirmationDialog("Leave this session?", isPresented: $confirmLeave, titleVisibility: .visible) {
            Button("Leave", role: .destructive) {
                Task { await store.leave(session.id) }
            }
        }
    }

    @ViewBuilder
    private func bottomBar(session: Session, phase: SessionPhase, isHost: Bool, isJoined: Bool) -> some View {
        VStack(spacing: 10) {
            if phase == .open && isHost {
                HStack(spacing: 12) {
                    SXButton(title: "Delete", kind: .danger) { confirmDelete = true }
                    SXButton(
                        title: SessionLifecycle.canStart(session) ? "Start Session" : "Starts later",
                        enabled: SessionLifecycle.canStart(session)
                    ) {
                        Task { await store.startSession(session.id) }
                    }
                }
            } else if phase == .open && !isJoined {
                SXButton(title: "Join Session") {
                    Task { await store.join(session.id) }
                }
            } else if phase == .ended {
                NavigationLink {
                    ShareReportView(session: session)
                } label: {
                    Text("Share Results")
                        .font(SXFont.label(12))
                        .textCase(.uppercase)
                        .tracking(2)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(SXColor.card)
                        .foregroundStyle(SXColor.neon)
                        .skewEffect()
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 12)
        .background(SXColor.base)
    }

    private func whenLabel(_ session: Session) -> String {
        guard let start = ISO.date(from: session.startTime),
              let end = ISO.date(from: session.endTime) else { return session.startTime }
        return "\(start.formatted(date: .abbreviated, time: .shortened)) – \(end.formatted(date: .omitted, time: .shortened))"
    }
}
