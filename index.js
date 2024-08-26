const fs = require('fs');
console.log(`Node.js version: ${process.version}`);

// Load data
const groupsData = JSON.parse(fs.readFileSync('groups.json', 'utf8'));
const exibitionsData = JSON.parse(fs.readFileSync('exibitions.json', 'utf8'));

function calculateForm(team, exhibitions) {
    const matches = exhibitions[team];
    if (!matches) return { averageScore: 0, averageDifference: 0 };

    let totalScore = 0;
    let totalDifference = 0;

    matches.forEach(match => {
        const [score, opponentScore] = match.Result.split('-').map(Number);
        totalScore += score;
        totalDifference += (score - opponentScore);
    });

    const averageScore = totalScore / matches.length;
    const averageDifference = totalDifference / matches.length;
    
    return { averageScore, averageDifference };
}

// Initialize standings
function initializeStandings(teams) {
    const standings = {};
    teams.forEach(team => {
        standings[team.ISOCode] = {
            name: team.Team,
            games: 0,
            wins: 0,
            losses: 0,
            points: 0,
            pointsFor: 0,
            pointsAgainst: 0,
            pointDifference: 0
        };
    });
    return standings;
}

// Simulate match
function simulateMatch(team1, team2) {
    // Calculate form for both teams
    const form1 = calculateForm(team1.code, exibitionsData);
    const form2 = calculateForm(team2.code, exibitionsData);

    // Base score with form adjustments
    const team1Score = Math.floor(Math.random() * (100 + form1.averageScore)) + form1.averageDifference;
    const team2Score = Math.floor(Math.random() * (100 + form2.averageScore)) + form2.averageDifference;

    return {
        team1Score: Math.max(team1Score, 0), // Ensure scores are non-negative
        team2Score: Math.max(team2Score, 0)
    };
}

// Update standings
function updateStandings(standings, team1, team2, result) {
    const team1Stats = standings[team1.ISOCode];
    const team2Stats = standings[team2.ISOCode];

    if (!team1Stats || !team2Stats) {
        console.error(`Standings Issue: ${team1.ISOCode} or ${team2.ISOCode} not found`);
        throw new Error('One or both teams are not found in standings');
    }

    team1Stats.games += 1;
    team2Stats.games += 1;
    team1Stats.pointsFor += result.team1Score;
    team1Stats.pointsAgainst += result.team2Score;
    team2Stats.pointsFor += result.team2Score;
    team2Stats.pointsAgainst += result.team1Score;
    team1Stats.pointDifference = team1Stats.pointsFor - team1Stats.pointsAgainst;
    team2Stats.pointDifference = team2Stats.pointsFor - team2Stats.pointsAgainst;

    if (result.team1Score > result.team2Score) {
        team1Stats.wins += 1;
        team1Stats.points += 2;
        team2Stats.losses += 1;
    } else if (result.team1Score < result.team2Score) {
        team2Stats.wins += 1;
        team2Stats.points += 2;
        team1Stats.losses += 1;
    } else {
        team1Stats.points += 1;
        team2Stats.points += 1;
    }
}

// Rank teams
function rankTeams(standings) {
    return Object.entries(standings).sort(([, a], [, b]) => {
        if (a.points !== b.points) return b.points - a.points;
        if (a.pointDifference !== b.pointDifference) return b.pointDifference - a.pointDifference;
        return b.pointsFor - a.pointsFor;
    });
}

// Simulate group stage
function simulateGroupStage() {
    const standings = {};

    Object.entries(groupsData).forEach(([groupName, teams]) => {
        standings[groupName] = initializeStandings(teams);

        console.log(`\nGrupna faza - I kolo - Grupa ${groupName}:`);
        for (let i = 0; i < teams.length; i++) {
            for (let j = i + 1; j < teams.length; j++) {
                const team1 = teams[i];
                const team2 = teams[j];
                const result = simulateMatch(
                    { ISOCode: team1.ISOCode, fibaRanking: team1.FIBARanking },
                    { ISOCode: team2.ISOCode, fibaRanking: team2.FIBARanking }
                );
                console.log(`${team1.Team} - ${team2.Team} (${result.team1Score}:${result.team2Score})`);
                updateStandings(standings[groupName], team1, team2, result);
            }
        }

        const rankedTeams = rankTeams(standings[groupName]);
        console.log(`\nKonačan plasman u grupi ${groupName}:`);
        rankedTeams.forEach(([code, team]) => {
            console.log(`    ${team.name} ${team.games} / ${team.games - team.wins} / ${team.points} / ${team.pointsFor} / ${team.pointsAgainst} / ${team.pointDifference}`);
        });
    });

    return standings;
}

// Flatten array utility function
function flattenArray(arr) {
    return arr.reduce((acc, val) => acc.concat(val), []);
}

// Draw elimination phase
function drawElimination(standings) {
    const topTeams = flattenArray(Object.values(standings).map(rankTeams)).slice(0, 9);

    const [first, second, third, fourth, fifth, sixth, seventh, eighth, ninth] = topTeams;

    // Elimination draw
    const draw = {
        D: [first[0], second[0]],
        E: [third[0], fourth[0]],
        F: [fifth[0], sixth[0]],
        G: [seventh[0], eighth[0]]
    };

    return draw;
}

// Simulate elimination phase
function simulateElimination(draw) {
    const quarterfinals = [
        { team1: draw.D[0], team2: draw.G[0] },
        { team1: draw.D[1], team2: draw.G[1] },
        { team1: draw.E[0], team2: draw.F[0] },
        { team1: draw.E[1], team2: draw.F[1] }
    ];

    const results = {};

    console.log(`\nČetvrtfinale:`);
    quarterfinals.forEach(({ team1, team2 }) => {
        const team1Data = flattenArray(Object.values(groupsData)).find(t => t.ISOCode === team1);
        const team2Data = flattenArray(Object.values(groupsData)).find(t => t.ISOCode === team2);

        if (!team1Data || !team2Data) {
            console.error(`Error: Teams ${team1} or ${team2} not found in group data`);
            return;
        }

        const result = simulateMatch(
            { ISOCode: team1, fibaRanking: team1Data.FIBARanking },
            { ISOCode: team2, fibaRanking: team2Data.FIBARanking }
        );
        console.log(`${team1Data.Team} - ${team2Data.Team} (${result.team1Score}:${result.team2Score})`);
        results[team1] = result.team1Score > result.team2Score ? 'W' : 'L';
        results[team2] = result.team1Score < result.team2Score ? 'W' : 'L';
    });

    // Determine winners and losers
    const winners = quarterfinals.map(({ team1, team2 }) => {
        const winner = results[team1] === 'W' ? team1 : team2;
        return winner;
    });

    const semifinals = [
        { team1: winners[0], team2: winners[1] },
        { team1: winners[2], team2: winners[3] }
    ];

    console.log(`\nPolufinale:`);
    const semifinalResults = {};
    semifinals.forEach(({ team1, team2 }) => {
        const team1Data = flattenArray(Object.values(groupsData)).find(t => t.ISOCode === team1);
        const team2Data = flattenArray(Object.values(groupsData)).find(t => t.ISOCode === team2);

        if (!team1Data || !team2Data) {
            console.error(`Error: Teams ${team1} or ${team2} not found in group data`);
            return;
        }

        const result = simulateMatch(
            { ISOCode: team1, fibaRanking: team1Data.FIBARanking },
            { ISOCode: team2, fibaRanking: team2Data.FIBARanking }
        );
        console.log(`${team1Data.Team} - ${team2Data.Team} (${result.team1Score}:${result.team2Score})`);
        semifinalResults[team1] = result.team1Score > result.team2Score ? 'W' : 'L';
        semifinalResults[team2] = result.team1Score < result.team2Score ? 'W' : 'L';
    });

    // Determine semifinal winners and losers
    const [finalist1, finalist2] = semifinals.map(({ team1, team2 }) => {
        return semifinalResults[team1] === 'W' ? team1 : team2;
    });

    const thirdPlaceTeam = winners.find(t => t !== finalist1 && t !== finalist2);

    // Simulate the third-place match
    console.log(`\nUtakmica za treće mesto:`);
    const thirdPlaceResult = simulateMatch(
        { ISOCode: thirdPlaceTeam, fibaRanking: flattenArray(Object.values(groupsData)).find(t => t.ISOCode === thirdPlaceTeam).FIBARanking },
        { ISOCode: semifinalResults[finalist1] === 'L' ? finalist1 : finalist2, fibaRanking: flattenArray(Object.values(groupsData)).find(t => t.ISOCode === (semifinalResults[finalist1] === 'L' ? finalist1 : finalist2)).FIBARanking }
    );
    console.log(`${thirdPlaceTeam} - ${semifinalResults[finalist1] === 'L' ? finalist1 : finalist2} (${thirdPlaceResult.team1Score}:${thirdPlaceResult.team2Score})`);
    const thirdPlaceWinner = thirdPlaceResult.team1Score > thirdPlaceResult.team2Score ? thirdPlaceTeam : (semifinalResults[finalist1] === 'L' ? finalist1 : finalist2);

    // Simulate the final
    console.log(`\nFinale:`);
    const finalResult = simulateMatch(
        { ISOCode: finalist1, fibaRanking: flattenArray(Object.values(groupsData)).find(t => t.ISOCode === finalist1).FIBARanking },
        { ISOCode: finalist2, fibaRanking: flattenArray(Object.values(groupsData)).find(t => t.ISOCode === finalist2).FIBARanking }
    );
    console.log(`${finalist1} - ${finalist2} (${finalResult.team1Score}:${finalResult.team2Score})`);
    const finalWinner = finalResult.team1Score > finalResult.team2Score ? finalist1 : finalist2;

    // Output medals
    console.log(`\nMedalje:`);
    console.log(`    1. ${finalWinner}`);
    console.log(`    2. ${finalist1 === finalWinner ? finalist2 : finalist1}`);
    console.log(`    3. ${thirdPlaceWinner}`);
}


// Main function to run the simulation
function main() {
    console.log('Simulacija grupne faze:');
    const standings = simulateGroupStage();

    console.log('\nŽreb:');
    const draw = drawElimination(standings);
    console.log('Šešir D:', draw.D);
    console.log('Šešir E:', draw.E);
    console.log('Šešir F:', draw.F);
    console.log('Šešir G:', draw.G);

    console.log('\nEliminaciona faza:');
    simulateElimination(draw);
}

main();
