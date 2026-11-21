import Foundation

struct Player: Identifiable, Hashable, Sendable {
    var id: String
    var name: String
    var avatar: String
    var points: Int
    var wins: Int
    var losses: Int
    var rankFrame: String
    var specialFrame: String?

    var played: Int { wins + losses }
    var winRate: Int { played > 0 ? Int((Double(wins) / Double(played) * 100).rounded()) : 0 }
}

struct MatchResult: Identifiable, Hashable, Codable, Sendable {
    var id: String
    var timestamp: String
    var team1Ids: [String]
    var team2Ids: [String]
    var winningTeamIndex: Int
    var pointsChange: Int
    var eloChanges: [String: Int]?

    func includes(_ playerId: String) -> Bool {
        team1Ids.contains(playerId) || team2Ids.contains(playerId)
    }

    func winners() -> [String] {
        winningTeamIndex == 1 ? team1Ids : team2Ids
    }

    func losers() -> [String] {
        winningTeamIndex == 1 ? team2Ids : team1Ids
    }
}

struct BillItem: Hashable, Codable, Sendable {
    var userId: String
    var durationMinutes: Int
    var amount: Int
}

struct FinalBill: Hashable, Codable, Sendable {
    var totalCourtPrice: Double
    var totalShuttlePrice: Double
    var shuttlesUsed: Int
    var pricePerShuttle: Double
    var totalCost: Double
    var splitMode: String?
    var items: [BillItem]
}

struct Session: Identifiable, Hashable, Sendable {
    var id: String
    var title: String?
    var location: String
    var startTime: String
    var endTime: String
    var courtCount: Int
    var maxPlayers: Int
    var hostId: String
    var playerIds: [String]
    var started: Bool
    var checkedInPlayerIds: [String]
    var checkInTimes: [String: String]
    var courtAssignments: [String: [String]]
    var matchStartTimes: [String: String]
    var matches: [MatchResult]
    var finalBill: FinalBill?

    var displayTitle: String {
        let trimmed = title?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        return trimmed.isEmpty ? location : trimmed
    }

    func isHost(_ userId: String?) -> Bool { hostId == userId }
    func isJoined(_ userId: String?) -> Bool {
        guard let userId else { return false }
        return playerIds.contains(userId)
    }
}

struct CreateSessionDraft: Equatable, Sendable {
    var title: String
    var location: String
    var start: Date
    var end: Date
    var courtCount: Int

    static func blank(now: Date = .now) -> CreateSessionDraft {
        let calendar = Calendar.current
        let start = calendar.date(bySettingHour: 19, minute: 0, second: 0, of: now) ?? now
        let end = calendar.date(byAdding: .hour, value: 2, to: start) ?? start.addingTimeInterval(7200)
        return CreateSessionDraft(title: "", location: "", start: start, end: end, courtCount: 1)
    }

    static func from(_ session: Session) -> CreateSessionDraft {
        CreateSessionDraft(
            title: session.title ?? "",
            location: session.location,
            start: ISO.date(from: session.startTime) ?? .now,
            end: ISO.date(from: session.endTime) ?? .now,
            courtCount: session.courtCount
        )
    }
}

enum AppTab: String, CaseIterable, Identifiable {
    case sessions
    case leaderboard
    case groups
    case add

    var id: String { rawValue }

    var title: String {
        switch self {
        case .sessions: return "Sessions"
        case .leaderboard: return "Leaderboard"
        case .groups: return "Groups"
        case .add: return "Add"
        }
    }

    var systemImage: String {
        switch self {
        case .sessions: return "calendar"
        case .leaderboard: return "trophy"
        case .groups: return "person.3"
        case .add: return "plus"
        }
    }
}

enum AuthRoute: Equatable {
    case welcome
    case login
    case register
}

struct Toast: Equatable, Identifiable {
    let id = UUID()
    let message: String
    let isError: Bool
}

enum ISO {
    static let formatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    static let fallback: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()

    static func date(from string: String) -> Date? {
        formatter.date(from: string) ?? fallback.date(from: string)
    }

    static func string(from date: Date) -> String {
        formatter.string(from: date)
    }
}

enum AuthIdentity {
    static func email(from username: String) -> String {
        username.replacingOccurrences(of: " ", with: "").lowercased() + "@example.com"
    }

    static func isValidUsername(_ name: String) -> Bool {
        name.range(of: #"^[a-zA-Z0-9_\s]+$"#, options: .regularExpression) != nil
    }
}

struct PlayerGroup: Identifiable, Hashable, Sendable {
    var id: String
    var name: String
    var ownerId: String
    var memberIds: [String]
}
