import Foundation

enum RankTier: String, CaseIterable, Identifiable {
    case unpolished
    case spark
    case combustion
    case voidTier = "void"
    case ascended

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .unpolished: return "The Cocoon"
        case .spark: return "The Chrysalis"
        case .combustion: return "The Emergence"
        case .voidTier: return "The Monarch"
        case .ascended: return "The Emperor"
        }
    }

    var shortName: String {
        switch self {
        case .unpolished: return "Cocoon"
        case .spark: return "Chrysalis"
        case .combustion: return "Emergence"
        case .voidTier: return "Monarch"
        case .ascended: return "Emperor"
        }
    }

    var minimumPoints: Int {
        switch self {
        case .unpolished: return 0
        case .spark: return 1100
        case .combustion: return 1300
        case .voidTier: return 1600
        case .ascended: return 2000
        }
    }

    static func from(points: Int) -> RankTier {
        if points >= 2000 { return .ascended }
        if points >= 1600 { return .voidTier }
        if points >= 1300 { return .combustion }
        if points >= 1100 { return .spark }
        return .unpolished
    }

    static func progress(points: Int) -> (progress: Double, remaining: Int, nextName: String) {
        let current = from(points: points)
        guard let index = allCases.firstIndex(of: current), index + 1 < allCases.count else {
            return (1, 0, "Max")
        }
        let next = allCases[index + 1]
        let span = Double(next.minimumPoints - current.minimumPoints)
        let gained = Double(points - current.minimumPoints)
        return (min(1, max(0, gained / span)), next.minimumPoints - points, next.shortName)
    }
}

enum Elo {
    static func computeDeltas(
        team1Ids: [String],
        team2Ids: [String],
        winningTeamIndex: Int,
        players: [Player]
    ) -> [String: Int] {
        let lookup = Dictionary(uniqueKeysWithValues: players.map { ($0.id, $0) })
        func average(_ ids: [String]) -> Double {
            let points = ids.map { Double(lookup[$0]?.points ?? 1000) }
            guard !points.isEmpty else { return 1000 }
            return points.reduce(0, +) / Double(points.count)
        }
        let kFactor = 50.0

        let winnerIds = winningTeamIndex == 1 ? team1Ids : team2Ids
        let loserIds = winningTeamIndex == 1 ? team2Ids : team1Ids
        let expectedWinner = 1 / (1 + pow(10, (average(loserIds) - average(winnerIds)) / 950))

        var changes: [String: Int] = [:]
        for id in winnerIds {
            changes[id] = Int((kFactor * (1 - expectedWinner)).rounded())
        }
        for id in loserIds {
            changes[id] = Int((kFactor * (expectedWinner - 1)).rounded())
        }
        return changes
    }

    static func delta(for match: MatchResult, playerId: String) -> Int {
        if let stored = match.eloChanges?[playerId] { return stored }
        return match.winners().contains(playerId) ? match.pointsChange : -match.pointsChange
    }
}
