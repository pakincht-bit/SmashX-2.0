import Foundation

struct ProfileRow: Codable, Sendable {
    var id: String
    var name: String
    var avatar: String?
    var points: Int?
    var mmr: Int?
    var wins: Int?
    var losses: Int?
    var rankFrame: String?
    var specialFrame: String?

    enum CodingKeys: String, CodingKey {
        case id, name, avatar, points, mmr, wins, losses
        case rankFrame = "rank_frame"
        case specialFrame = "special_frame"
    }
}

struct SessionRow: Codable, Sendable {
    var id: String
    var title: String?
    var location: String
    var startTime: String
    var endTime: String
    var courtCount: Int
    var maxPlayers: Int?
    var hostId: String
    var playerIds: [String]?
    var checkedInPlayerIds: [String]?
    var checkInTimes: [String: String]?
    var courtAssignments: [String: [String]]?
    var matchStartTimes: [String: String]?
    var matches: [MatchResult]?
    var finalBill: FinalBill?
    var started: Bool?

    enum CodingKeys: String, CodingKey {
        case id, title, location, matches, started
        case startTime = "start_time"
        case endTime = "end_time"
        case courtCount = "court_count"
        case maxPlayers = "max_players"
        case hostId = "host_id"
        case playerIds = "player_ids"
        case checkedInPlayerIds = "checked_in_player_ids"
        case checkInTimes = "check_in_times"
        case courtAssignments = "court_assignments"
        case matchStartTimes = "match_start_times"
        case finalBill = "final_bill"
    }
}

enum Mappers {
    static func player(from row: ProfileRow) -> Player {
        let points = row.points ?? row.mmr ?? 1000
        let special = row.specialFrame?.lowercased()
        return Player(
            id: row.id,
            name: row.name,
            avatar: row.avatar ?? Avatar.defaultURL(seed: row.id),
            points: points,
            wins: row.wins ?? 0,
            losses: row.losses ?? 0,
            rankFrame: special ?? RankTier.from(points: points).rawValue,
            specialFrame: special
        )
    }

    static func session(from row: SessionRow) -> Session {
        let checkedIn = row.checkedInPlayerIds ?? []
        return Session(
            id: row.id,
            title: row.title,
            location: row.location,
            startTime: row.startTime,
            endTime: row.endTime,
            courtCount: row.courtCount,
            maxPlayers: row.maxPlayers ?? SessionLifecycle.maxPlayers(courtCount: row.courtCount),
            hostId: row.hostId,
            playerIds: row.playerIds ?? [],
            started: row.started ?? !checkedIn.isEmpty,
            checkedInPlayerIds: checkedIn,
            checkInTimes: row.checkInTimes ?? [:],
            courtAssignments: row.courtAssignments ?? [:],
            matchStartTimes: row.matchStartTimes ?? [:],
            matches: row.matches ?? [],
            finalBill: row.finalBill
        )
    }
}

struct SessionInsert: Encodable {
    var title: String
    var location: String
    var startTime: String
    var endTime: String
    var courtCount: Int
    var maxPlayers: Int
    var hostId: String
    var playerIds: [String]

    enum CodingKeys: String, CodingKey {
        case title, location
        case startTime = "start_time"
        case endTime = "end_time"
        case courtCount = "court_count"
        case maxPlayers = "max_players"
        case hostId = "host_id"
        case playerIds = "player_ids"
    }
}

struct RecordMatchParams: Encodable {
    var pSessionId: String
    var pMatchId: String
    var pCourtIndex: Int
    var pTeam1Ids: [String]
    var pTeam2Ids: [String]
    var pWinningTeamIndex: Int
    var pNow: String

    enum CodingKeys: String, CodingKey {
        case pSessionId = "p_session_id"
        case pMatchId = "p_match_id"
        case pCourtIndex = "p_court_index"
        case pTeam1Ids = "p_team1_ids"
        case pTeam2Ids = "p_team2_ids"
        case pWinningTeamIndex = "p_winning_team_index"
        case pNow = "p_now"
    }
}

struct RecordMatchResponse: Decodable {
    var success: Bool?
    var eloChanges: [String: Int]?
}

struct UndoMatchParams: Encodable {
    var pSessionId: String
    var pMatchId: String
    var pTeam1Ids: [String]
    var pTeam2Ids: [String]
    var pWinningTeamIndex: Int
    var pPointsChange: Int

    enum CodingKeys: String, CodingKey {
        case pSessionId = "p_session_id"
        case pMatchId = "p_match_id"
        case pTeam1Ids = "p_team1_ids"
        case pTeam2Ids = "p_team2_ids"
        case pWinningTeamIndex = "p_winning_team_index"
        case pPointsChange = "p_points_change"
    }
}

struct GroupRow: Decodable {
    var id: String
    var name: String
    var ownerId: String
    var memberIds: [String]?

    enum CodingKeys: String, CodingKey {
        case id, name
        case ownerId = "owner_id"
        case memberIds = "member_ids"
    }
}

struct GroupTableRow: Decodable {
    var id: String
    var name: String
    var ownerId: String

    enum CodingKeys: String, CodingKey {
        case id, name
        case ownerId = "owner_id"
    }
}

struct GroupMemberRow: Decodable {
    var groupId: String
    var userId: String

    enum CodingKeys: String, CodingKey {
        case groupId = "group_id"
        case userId = "user_id"
    }
}
