import Foundation

enum SessionPhase: String {
    case open
    case playing
    case ended
}

enum SessionLifecycle {
    static let startThresholdMinutes = 30
    static let autoEndGrace: TimeInterval = 30 * 60

    static func phase(for session: Session, now: Date = .now) -> SessionPhase {
        if session.finalBill != nil { return .ended }
        guard let start = ISO.date(from: session.startTime),
              let end = ISO.date(from: session.endTime) else {
            return session.started ? .playing : .open
        }
        let endWithGrace = end.addingTimeInterval(autoEndGrace)
        if now > endWithGrace { return .ended }
        if session.started || (now >= start && now <= endWithGrace) { return .playing }
        return .open
    }

    static func canStart(_ session: Session, now: Date = .now) -> Bool {
        guard let start = ISO.date(from: session.startTime) else { return false }
        return now >= start.addingTimeInterval(TimeInterval(-startThresholdMinutes * 60))
    }

    static func isUpcoming(_ session: Session, now: Date = .now) -> Bool {
        guard let end = ISO.date(from: session.endTime) else { return false }
        return now.timeIntervalSince1970 <= end.timeIntervalSince1970 + autoEndGrace
    }

    static func maxPlayers(courtCount: Int) -> Int { courtCount * 6 }
}
