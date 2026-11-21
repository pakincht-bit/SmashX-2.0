import Foundation

struct EncounterStat: Identifiable, Hashable {
    var id: String
    var playedWith: Int = 0
    var wonWith: Int = 0
    var playedAgainst: Int = 0
    var lostAgainst: Int = 0

    var teammateWinRate: Int {
        playedWith > 0 ? Int((Double(wonWith) / Double(playedWith) * 100).rounded()) : 0
    }
}

struct PlayerStatsSummary {
    var currentStreak: Int
    var maxWinStreak: Int
    var last10: [Bool]
    var duoPartnerId: String?
    var frequentDuoId: String?
    var nemesisId: String?
    var easyTargetId: String?
    var encounters: [EncounterStat]
}

enum Analytics {
    static func summary(for userId: String, sessions: [Session]) -> PlayerStatsSummary {
        var encounters: [String: EncounterStat] = [:]
        var myMatches: [(won: Bool, date: Date)] = []

        for session in sessions {
            for match in session.matches where match.includes(userId) {
                let isTeam1 = match.team1Ids.contains(userId)
                let won = (isTeam1 && match.winningTeamIndex == 1) || (!isTeam1 && match.winningTeamIndex == 2)
                myMatches.append((won, ISO.date(from: match.timestamp) ?? ISO.date(from: session.startTime) ?? .distantPast))

                let myTeam = isTeam1 ? match.team1Ids : match.team2Ids
                let otherTeam = isTeam1 ? match.team2Ids : match.team1Ids
                for id in myTeam where id != userId {
                    var current = encounters[id] ?? EncounterStat(id: id)
                    current.playedWith += 1
                    if won { current.wonWith += 1 }
                    encounters[id] = current
                }
                for id in otherTeam {
                    var current = encounters[id] ?? EncounterStat(id: id)
                    current.playedAgainst += 1
                    if !won { current.lostAgainst += 1 }
                    encounters[id] = current
                }
            }
        }

        myMatches.sort { $0.date < $1.date }
        var current = 0
        var best = 0
        var running = 0
        for match in myMatches {
            if match.won {
                running += 1
                best = max(best, running)
            } else {
                running = 0
            }
        }
        if let last = myMatches.last {
            if last.won {
                current = myMatches.reversed().prefix(while: { $0.won }).count
            } else {
                current = -myMatches.reversed().prefix(while: { !$0.won }).count
            }
        }

        let last10 = Array(myMatches.suffix(10).map(\.won))
        let values = Array(encounters.values)

        let duo = values.filter { $0.playedWith > 0 }.max {
            ($0.teammateWinRate + $0.wonWith) < ($1.teammateWinRate + $1.wonWith)
        }
        let frequent = values.max(by: { $0.playedWith < $1.playedWith })
        let nemesis = values.max(by: { $0.lostAgainst < $1.lostAgainst })
        let target = values.max {
            ($0.playedAgainst - $0.lostAgainst) < ($1.playedAgainst - $1.lostAgainst)
        }

        return PlayerStatsSummary(
            currentStreak: current,
            maxWinStreak: best,
            last10: last10,
            duoPartnerId: duo?.id,
            frequentDuoId: frequent?.id,
            nemesisId: (nemesis?.lostAgainst ?? 0) > 0 ? nemesis?.id : nil,
            easyTargetId: ((target?.playedAgainst ?? 0) - (target?.lostAgainst ?? 0)) > 0 ? target?.id : nil,
            encounters: values
        )
    }

    static func sessionStandings(session: Session) -> [(id: String, wins: Int, losses: Int, points: Int)] {
        var scores: [String: (wins: Int, losses: Int, points: Int)] = [:]
        for id in session.playerIds {
            scores[id] = (0, 0, 0)
        }
        for match in session.matches {
            for id in match.winners() {
                scores[id, default: (0, 0, 0)].wins += 1
                scores[id, default: (0, 0, 0)].points += Elo.delta(for: match, playerId: id)
            }
            for id in match.losers() {
                scores[id, default: (0, 0, 0)].losses += 1
                scores[id, default: (0, 0, 0)].points += Elo.delta(for: match, playerId: id)
            }
        }
        return scores
            .map { (id: $0.key, wins: $0.value.wins, losses: $0.value.losses, points: $0.value.points) }
            .sorted {
                if $0.points != $1.points { return $0.points > $1.points }
                return $0.wins > $1.wins
            }
    }
}
