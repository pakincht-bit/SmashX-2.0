
import React, { useState, useEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react';
import { Session, User, CreateSessionDTO, FinalBill, MatchResult } from './types';
import { calculateMaxPlayers, mapSessionFromDB, mapProfileFromDB, getFrameByPoints, triggerHaptic, generateId, calculateQueue, getAvailablePlayers } from './utils';
import Header from './components/Header';
import SessionCard from './components/SessionCard';
import CreateSessionModal from './components/CreateSessionModal';
// OPTIMIZATION: Lazy load SessionDetailModal (78KB) to reduce initial bundle size
const SessionDetailModal = lazy(() => import('./components/SessionDetailModal'));
import PlayerProfileModal from './components/PlayerProfileModal';
import BottomNav from './components/BottomNav';
import Leaderboard from './components/Leaderboard';
import Profile from './components/Profile';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import SettingsScreen from './components/SettingsScreen';
import ArenaTiersModal from './components/ArenaTiersModal';
import InstallGuideModal from './components/InstallGuideModal';
import InstallBanner from './components/InstallBanner';
import PullToRefresh from './components/PullToRefresh';
import { Info, CheckCircle, Loader2, Calendar, WifiOff, RefreshCcw, Zap, Plus } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Analytics } from '@vercel/analytics/react';

const SESSIONS_PER_PAGE = 10;
const INITIAL_LOAD_TIMEOUT = 15000;
const FETCH_TIMEOUT = 12000;
const AUTO_END_GRACE_PERIOD_MS = 30 * 60 * 1000; // 30 minutes grace period

const App: React.FC = () => {
    // Auth State
    const [authStage, setAuthStage] = useState<'splash' | 'login' | 'register' | 'app'>('splash');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isProcessingAuth, setIsProcessingAuth] = useState(false);

    // Data State
    const [users, setUsers] = useState<User[]>([]);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const isInitializing = useRef(false);

    // Infinite Scroll State
    const [visibleCount, setVisibleCount] = useState(SESSIONS_PER_PAGE);
    const observerTarget = useRef<HTMLDivElement>(null);

    // Navigation State
    const [activeTab, setActiveTab] = useState<'sessions' | 'leaderboard' | 'profile'>('sessions');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [viewingPlayerId, setViewingPlayerId] = useState<string | null>(null);

    // Profile Sub-modals
    const [showTiers, setShowTiers] = useState(false);
    const [showInstallGuide, setShowInstallGuide] = useState(false);

    // Toast State
    const [toast, setToast] = useState<{ message: string; visible: boolean; isError?: boolean } | null>(null);

    const showToast = useCallback((message: string, isError = false) => {
        setToast({ message, visible: true, isError });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // --- Helper: Fetch with Timeout ---
    const withTimeout = (promise: Promise<any>, ms: number = FETCH_TIMEOUT) => {
        return Promise.race([
            promise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), ms))
        ]);
    };

    // --- Realtime Subscription ---
    useEffect(() => {
        if (!isAuthenticated) return;

        const channel = supabase.channel('public:sessions')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'sessions' },
                (payload) => {
                    if (payload.eventType === 'INSERT') {
                        const newSession = mapSessionFromDB(payload.new);
                        setSessions(prev => {
                            if (prev.find(s => s.id === newSession.id)) return prev;
                            return [...prev, newSession].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
                        });
                    } else if (payload.eventType === 'UPDATE') {
                        setSessions(prev => prev.map(s => {
                            if (s.id !== payload.new.id) return s;
                            const newSession = mapSessionFromDB(payload.new);
                            // Preserve nextMatchups if missing/null in payload (handling incomplete updates or missing column)
                            // This ensures the optimistic update persists locally until a valid non-null update comes in
                            if ((payload.new.next_matchups === undefined || payload.new.next_matchups === null) && s.nextMatchups && s.nextMatchups.length > 0) {
                                newSession.nextMatchups = s.nextMatchups;
                            }
                            return newSession;
                        }));
                    } else if (payload.eventType === 'DELETE') {
                        setSessions(prev => prev.filter(s => s.id !== payload.old.id));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isAuthenticated]);

    // --- Data Fetching ---

    const fetchData = async () => {
        console.log("SX: Fetching Arena Data...");
        setFetchError(null);
        try {
            // OPTIMIZATION: Split fetching into Critical (Active/Future) vs History
            // This allows the user to interact with the app much faster

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1); // active window = last 24h

            // 1. Critical Load: Profiles + Active/Upcoming Sessions
            const [profilesRes, activeSessionsRes] = await Promise.all([
                withTimeout(supabase.from('profiles').select('*')),
                withTimeout(
                    supabase.from('sessions')
                        .select('*')
                        .gte('end_time', yesterday.toISOString()) // Only recent/ongoing
                        .order('start_time', { ascending: true })
                )
            ]) as any;

            if (profilesRes.error) throw profilesRes.error;
            if (activeSessionsRes.error) throw activeSessionsRes.error;

            if (profilesRes.data) {
                const mappedUsers = profilesRes.data.map(mapProfileFromDB);
                // Derive rank_frame from stored points (canonical source)
                mappedUsers.forEach((u: User) => { u.rankFrame = getFrameByPoints(u.points); });
                setUsers(mappedUsers);
            }

            // Set initial active sessions to unblock UI
            if (activeSessionsRes.data) {
                const activeSessions = activeSessionsRes.data.map(mapSessionFromDB);
                setSessions(activeSessions);
            }

            // Unlock UI immediately — no history fetch needed!
            // Points are stored directly in profiles table.
            setIsInitialLoading(false);
            console.log("SX: Data fetched (points from profiles, active sessions only)");

        } catch (error: any) {
            console.error("SX: Fetch data failed:", error.message);
            if (sessions.length === 0) {
                setFetchError(error.message || "Connection failed.");
                setIsInitialLoading(false);
            }
        }
    };

    // fetchHistoryData removed — points are now stored in profiles table.
    // No need to download historical sessions for points calculation.

    const fetchUserProfile = async (userId: string) => {
        console.log("SX: Fetching User Profile for", userId);
        try {
            const { data, error } = await withTimeout(
                supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
            ) as any;

            if (error) throw error;

            if (data) {
                setCurrentUser(mapProfileFromDB(data));
            } else {
                const { data: { session } } = await supabase.auth.getSession();
                const userName = session?.user?.user_metadata?.name || 'Player';
                const userAvatar = session?.user?.user_metadata?.avatar || `https://api.dicebear.com/9.x/adventurer/svg?seed=${userId}`;

                const { data: newProfile } = await supabase.from('profiles').upsert({
                    id: userId,
                    name: userName,
                    avatar: userAvatar,
                    points: 1000,
                    rank_frame: 'unpolished'
                }).select().maybeSingle();

                if (newProfile) {
                    setCurrentUser(mapProfileFromDB(newProfile));
                } else {
                    setCurrentUser({ id: userId, name: userName, avatar: userAvatar, points: 1000, rankFrame: 'unpolished' });
                }
            }
        } catch (error: any) {
            console.error("SX: Error fetching user profile:", error.message);
            if (!currentUser) {
                setCurrentUser({
                    id: userId,
                    name: 'Arena Player',
                    avatar: `https://api.dicebear.com/9.x/adventurer/svg?seed=${userId}`,
                    points: 1000,
                    rankFrame: 'unpolished'
                });
            }
        }
    };

    const initializeApp = async (session: any) => {
        if (isInitializing.current) return;
        isInitializing.current = true;

        try {
            if (session) {
                setIsAuthenticated(true);
                setAuthStage('app');
                await Promise.allSettled([
                    fetchUserProfile(session.user.id),
                    fetchData()
                ]);
            } else {
                setIsAuthenticated(false);
                setAuthStage('splash');
                setIsInitialLoading(false);
            }
        } catch (err) {
            setIsInitialLoading(false);
        } finally {
            isInitializing.current = false;
        }
    };

    useEffect(() => {
        const failsafe = setTimeout(() => {
            if (isInitialLoading) setIsInitialLoading(false);
        }, INITIAL_LOAD_TIMEOUT);

        const checkInitialSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) await initializeApp(session);
                else setIsInitialLoading(false);
            } catch (e) {
                setIsInitialLoading(false);
            }
        };

        checkInitialSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
                await initializeApp(session);
            } else if (event === 'SIGNED_OUT') {
                setIsAuthenticated(false);
                setAuthStage('splash');
                setCurrentUser(null);
                setIsInitialLoading(false);
                isInitializing.current = false;
            }
        });

        return () => {
            clearTimeout(failsafe);
            subscription.unsubscribe();
        };
    }, []);

    // Points are now stored directly in profiles table — no client-side recalculation needed.
    // users already has correct points and rankFrame from the DB fetch.

    const activeUser = useMemo(() => {
        if (!currentUser) return null;
        return users.find(u => u.id === currentUser.id) || currentUser;
    }, [currentUser, users]);

    const handleUpdateUser = async (updatedUser: User) => {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
        setCurrentUser(updatedUser);
        // Optimistic update done, now sync
        await supabase.from('profiles').update({
            name: updatedUser.name,
            avatar: updatedUser.avatar,
            rank_frame: updatedUser.rankFrame
        }).eq('id', updatedUser.id);
    };

    const handleLogin = async (name: string, password: string) => {
        const email = `${name.replace(/\s/g, '').toLowerCase()}@example.com`;
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
    };

    const handleRegister = async (name: string, avatarUrl: string, password?: string) => {
        if (!password || isProcessingAuth) return;
        setIsProcessingAuth(true);
        const email = `${name.replace(/\s/g, '').toLowerCase()}@example.com`;
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { name, avatar: avatarUrl } }
        });
        if (error) { setIsProcessingAuth(false); throw error; }
        setIsProcessingAuth(false);
    };

    const handleLogout = async () => { await supabase.auth.signOut(); };
    const handleDeleteAccount = async () => { if (currentUser) { await supabase.rpc('delete_user'); await handleLogout(); } };
    const handleUserChange = (userId: string) => { const user = users.find(u => u.id === userId); if (user) setCurrentUser(user); };

    // --- OPTIMIZED ACTION HANDLERS ---

    const handleSaveSession = async (data: CreateSessionDTO): Promise<string | null> => {
        if (!currentUser) return "Login required.";

        triggerHaptic('medium');

        const startDateTime = new Date(`${data.date}T${data.startTime}`);
        let endDateTime = new Date(`${data.date}T${data.endTime}`);
        if (endDateTime < startDateTime) endDateTime.setDate(endDateTime.getDate() + 1);

        if (editingSession) {
            // UPDATE Existing Session
            const previousSessions = sessions;
            const updatedSession = {
                ...editingSession,
                title: data.title,
                location: data.location,
                startTime: startDateTime.toISOString(),
                endTime: endDateTime.toISOString(),
                courtCount: data.courtCount,
                maxPlayers: calculateMaxPlayers(data.courtCount),
            };

            // Optimistic Update
            setSessions(prev => prev.map(s => s.id === editingSession.id ? updatedSession : s));

            const { error } = await supabase.from('sessions').update({
                title: data.title,
                location: data.location,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                court_count: data.courtCount,
                max_players: calculateMaxPlayers(data.courtCount),
            }).eq('id', editingSession.id);

            if (error) {
                setSessions(previousSessions);
                return error.message;
            }
            showToast("Session Updated", false);
        } else {
            // CREATE New Session
            const { data: newSession, error } = await supabase.from('sessions').insert({
                title: data.title,
                location: data.location,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                court_count: data.courtCount,
                max_players: calculateMaxPlayers(data.courtCount),
                host_id: currentUser.id,
                player_ids: [currentUser.id],
            }).select().single();

            if (error) return error.message;

            if (newSession) {
                const mapped = mapSessionFromDB(newSession);
                setSessions(prev => [...prev, mapped].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
                showToast("Session Created", false);
            }
        }
        return null;
    };

    const handleEditSessionTrigger = (sessionId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (session) {
            setEditingSession(session);
            setIsModalOpen(true);
        }
    };

    const handleJoin = async (sessionId: string) => {
        if (!currentUser) return;
        const session = sessions.find(s => s.id === sessionId);
        if (!session || session.playerIds.includes(currentUser.id)) return;

        // 1. Optimistic Update
        const previousSessions = sessions;
        const updatedPlayerIds = [...session.playerIds, currentUser.id];

        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, playerIds: updatedPlayerIds } : s));

        // 2. Network Request
        const { error } = await supabase.from('sessions').update({ player_ids: updatedPlayerIds }).eq('id', sessionId);

        // 3. Rollback if error
        if (error) {
            console.error("Join failed", error);
            setSessions(previousSessions);
            showToast("Failed to join", true);
        }
    };

    const handleLeave = async (sessionId: string) => {
        if (!currentUser) return;
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        // 1. Optimistic Update
        const previousSessions = sessions;
        const newPlayerIds = session.playerIds.filter(id => id !== currentUser.id);

        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, playerIds: newPlayerIds } : s));

        // 2. Network Request
        const { error } = await supabase.from('sessions').update({ player_ids: newPlayerIds }).eq('id', sessionId);

        // 3. Rollback if error
        if (error) {
            console.error("Leave failed", error);
            setSessions(previousSessions);
            showToast("Failed to leave", true);
        }
    };

    const handleDelete = async (sessionId: string) => {
        const previousSessions = sessions;

        // Optimistic Delete
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (selectedSessionId === sessionId) setSelectedSessionId(null);

        const { error } = await supabase.from('sessions').delete().eq('id', sessionId);

        if (error) {
            setSessions(previousSessions);
            showToast("Delete failed", true);
        } else {
            showToast("Session Deleted");
        }
    };

    const handleCheckInToggle = async (sessionId: string, playerId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        const previousSessions = sessions;
        const currentCheckedIn = session.checkedInPlayerIds || [];
        const isCheckingIn = !currentCheckedIn.includes(playerId);

        let newCheckedIn;
        if (isCheckingIn) newCheckedIn = [...currentCheckedIn, playerId];
        else newCheckedIn = currentCheckedIn.filter(id => id !== playerId);

        const newTimes = { ...(session.checkInTimes || {}) };
        if (isCheckingIn) newTimes[playerId] = new Date().toISOString();
        else delete newTimes[playerId];

        // Optimistic Update
        setSessions(prev => prev.map(s => s.id === sessionId ? {
            ...s,
            checkedInPlayerIds: newCheckedIn,
            checkInTimes: newTimes,
            started: s.started || (newCheckedIn.length > 0)
        } : s));

        const { error } = await supabase.from('sessions').update({
            checked_in_player_ids: newCheckedIn,
            check_in_times: newTimes
        }).eq('id', sessionId);

        if (error) {
            setSessions(previousSessions);
            showToast("Update failed", true);
        }
    };

    // Skip Turn: Reset player's check-in time to now (moves them to end of queue)
    // Skip Turn: Swap position with the next player in the queue
    const handleSkipTurn = async (sessionId: string, playerId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        console.log("SX: Skipping turn for", playerId);

        const previousSessions = sessions;
        const newTimes = { ...(session.checkInTimes || {}) };

        // Calculate current queue to find the next person
        const queue = calculateQueue(session);
        const available = getAvailablePlayers(queue); // Only swap with waiting players
        const currentIndex = available.findIndex(p => p.id === playerId);

        console.log("SX: Current Index:", currentIndex, "Available:", available.length);

        if (currentIndex !== -1 && currentIndex < available.length - 1) {
            // Swap with next person
            const nextPlayer = available[currentIndex + 1];

            // Get Date objects
            const dateA = new Date(available[currentIndex].waitingSince);
            const dateB = new Date(available[currentIndex + 1].waitingSince);

            console.log(`SX: Swapping ${playerId} (${dateA.toISOString()}) with ${nextPlayer.id} (${dateB.toISOString()})`);

            if (dateA.getTime() === dateB.getTime()) {
                // If times are equal, just make current player 1 second newer (moves down)
                const newDateA = new Date(dateA.getTime() + 1000);
                newTimes[playerId] = newDateA.toISOString();
                // nextPlayer stays same covers the swap effectively
            } else {
                // Standard swap
                newTimes[playerId] = dateB.toISOString();
                newTimes[nextPlayer.id] = dateA.toISOString();
            }

            showToast("Swapped with next player");
        } else {
            // If last or not found, fall back to moving to end (reset to now)
            console.log("SX: Moving to end of queue");
            newTimes[playerId] = new Date().toISOString();
            showToast("Moved to end of queue");
        }

        // Optimistic Update
        setSessions(prev => prev.map(s => s.id === sessionId ? {
            ...s,
            checkInTimes: newTimes
        } : s));

        const { error } = await supabase.from('sessions').update({
            check_in_times: newTimes
        }).eq('id', sessionId);

        if (error) {
            setSessions(previousSessions);
            showToast("Skip failed", true);
        }
    };

    const handleStartSession = async (sessionId: string, initialCheckInIds: string[] = []) => {
        const previousSessions = sessions;
        const now = new Date().toISOString();
        const checkInTimes: Record<string, string> = {};
        initialCheckInIds.forEach(id => { checkInTimes[id] = now; });

        // Optimistic
        setSessions(prev => prev.map(s => s.id === sessionId ? {
            ...s,
            started: true,
            checkedInPlayerIds: initialCheckInIds,
            checkInTimes: checkInTimes
        } : s));

        const { error } = await supabase.from('sessions').update({
            checked_in_player_ids: initialCheckInIds,
            check_in_times: checkInTimes
        }).eq('id', sessionId);

        if (error) {
            setSessions(previousSessions);
            showToast("Failed to start", true);
        } else {
            showToast("Session Started");
        }
    };

    const handleEndSession = async (sessionId: string, costData: any) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        const previousSessions = sessions;
        const { shuttlesUsed, pricePerShuttle, totalCourtPrice, splitMode } = costData;
        const totalShuttlePrice = shuttlesUsed * pricePerShuttle;
        const totalCost = totalCourtPrice + totalShuttlePrice;

        const checkedInIds = session.checkedInPlayerIds || [];

        let items = [];
        if (splitMode === 'EQUAL' && checkedInIds.length > 0) {
            const amount = Math.round(totalCost / checkedInIds.length);
            items = checkedInIds.map(userId => ({ userId, durationMinutes: 0, amount }));
        } else if (checkedInIds.length > 0) {
            const playerMatchCounts: Record<string, number> = {};
            checkedInIds.forEach(id => playerMatchCounts[id] = 0);
            (session.matches || []).forEach(m => {
                [...m.team1Ids, ...m.team2Ids].forEach(id => {
                    if (playerMatchCounts[id] !== undefined) playerMatchCounts[id]++;
                });
            });

            const totalParticipations = Object.values(playerMatchCounts).reduce((a, b) => a + b, 0);
            if (totalParticipations === 0) {
                const amount = Math.round(totalCost / checkedInIds.length);
                items = checkedInIds.map(userId => ({ userId, durationMinutes: 0, amount }));
            } else {
                items = checkedInIds.map(userId => ({
                    userId,
                    durationMinutes: 0,
                    amount: Math.round(((playerMatchCounts[userId] || 0) / totalParticipations) * totalCost)
                }));
            }
        }

        const finalBill: FinalBill = {
            totalCourtPrice,
            totalShuttlePrice,
            shuttlesUsed,
            pricePerShuttle,
            totalCost,
            splitMode,
            items
        };

        // Optimistic
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, finalBill } : s));

        const { error } = await supabase.from('sessions').update({ final_bill: finalBill }).eq('id', sessionId);
        if (error) {
            setSessions(previousSessions);
            showToast("Failed to end session", true);
        } else {
            showToast("Session Ended");
        }
    };

    const handleCourtAssignment = async (sessionId: string, courtIndex: number, playerIds: string[]) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        const previousSessions = sessions;
        const newAssignments = { ...(session.courtAssignments || {}) };
        const newStartTimes = { ...(session.matchStartTimes || {}) };

        if (playerIds.length === 0) {
            delete newAssignments[courtIndex];
            delete newStartTimes[courtIndex];
        } else {
            newAssignments[courtIndex] = playerIds;
            newStartTimes[courtIndex] = new Date().toISOString();
        }

        // Optimistic
        setSessions(prev => prev.map(s => s.id === sessionId ? {
            ...s,
            courtAssignments: newAssignments,
            matchStartTimes: newStartTimes
        } : s));

        const { error } = await supabase.from('sessions').update({
            court_assignments: newAssignments,
            match_start_times: newStartTimes
        }).eq('id', sessionId);

        if (error) {
            setSessions(previousSessions);
            showToast("Assignment failed", true);
        }
    };

    const handleQueueMatch = async (sessionId: string, playerIds: string[]) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;
        const previousSessions = sessions;
        const newMatchup = { id: generateId(), playerIds };
        const updatedQueue = [...(session.nextMatchups || []), newMatchup];

        // Optimistic
        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, nextMatchups: updatedQueue } : s));

        const { error } = await supabase.from('sessions').update({ next_matchups: updatedQueue }).eq('id', sessionId);
        if (error) {
            console.error("SX: Supabase Queue Match Error:", error);
            setSessions(previousSessions);
            showToast("Queue failed", true);
        } else {
            showToast("Match Queued");
        }
    };

    const handleDeleteQueuedMatch = async (sessionId: string, matchupId: string) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;
        const previousSessions = sessions;
        const updatedQueue = (session.nextMatchups || []).filter(m => m.id !== matchupId);

        setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, nextMatchups: updatedQueue } : s));

        const { error } = await supabase.from('sessions').update({ next_matchups: updatedQueue }).eq('id', sessionId);
        if (error) {
            console.error("SX: Supabase Delete Queue Match Error:", error);
            setSessions(previousSessions);
            showToast("Delete failed", true);
        }
    };

    const handlePromoteMatch = async (sessionId: string, matchupId: string, courtIndex: number) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        const matchup = (session.nextMatchups || []).find(m => m.id === matchupId);
        if (!matchup) return;

        // 1. Remove from Queue (Optimistic handled inside)
        await handleDeleteQueuedMatch(sessionId, matchupId);

        // 2. Assign to court (Optimistic handled inside)
        await handleCourtAssignment(sessionId, courtIndex, matchup.playerIds);
    };



    const handleRecordMatchResult = async (sessionId: string, courtIndex: number, winningTeamIndex: 1 | 2) => {
        const session = sessions.find(s => s.id === sessionId);
        if (!session) return;

        const previousSessions = sessions;
        const assignedPlayerIds = (session.courtAssignments || {})[courtIndex] || [];
        if (assignedPlayerIds.length === 0) return;

        const mid = Math.ceil(assignedPlayerIds.length / 2);
        const team1Ids = assignedPlayerIds.slice(0, mid);
        const team2Ids = assignedPlayerIds.slice(mid);

        const newMatch: MatchResult = {
            id: generateId(), // Local ID generation for optimism
            timestamp: new Date().toISOString(),
            team1Ids,
            team2Ids,
            winningTeamIndex,
            pointsChange: 25
        };

        // 1. Optimistic Update (Immediate Feedback)
        const optimisticMatches = [...(session.matches || []), newMatch];
        const newAssignments = { ...(session.courtAssignments || {}) };
        const newStartTimes = { ...(session.matchStartTimes || {}) };
        delete newAssignments[courtIndex];
        delete newStartTimes[courtIndex];

        // Reset check-in times for players who just finished playing
        // This moves them to the end of the queue, ensuring fairness
        const now = new Date().toISOString();
        const newCheckInTimes = { ...(session.checkInTimes || {}) };
        assignedPlayerIds.forEach(playerId => {
            newCheckInTimes[playerId] = now;
        });

        setSessions(prev => prev.map(s => s.id === sessionId ? {
            ...s,
            matches: optimisticMatches,
            courtAssignments: newAssignments,
            matchStartTimes: newStartTimes,
            checkInTimes: newCheckInTimes
        } : s));

        try {
            // 2. SAFETY FETCH: Fetch the absolute latest matches from DB before writing
            // This prevents overwriting the entire history if the local state was stale (e.g. user had 0 games locally but 5 in DB)
            const { data: freshSessionData, error: fetchError } = await supabase
                .from('sessions')
                .select('matches, check_in_times')
                .eq('id', sessionId)
                .single();

            if (fetchError) throw fetchError;

            // Merge DB matches with new match, avoiding duplicates
            const currentDbMatches: MatchResult[] = freshSessionData?.matches || [];
            // Check if ID collision (rare but possible in race conditions)
            const isDuplicate = currentDbMatches.some(m => m.id === newMatch.id);

            const finalMatches = isDuplicate ? currentDbMatches : [...currentDbMatches, newMatch];

            // Safely merge check-in times (reset for players who finished)
            const dbCheckInTimes = freshSessionData?.check_in_times || {};
            const finalCheckInTimes = { ...dbCheckInTimes };
            assignedPlayerIds.forEach(playerId => {
                finalCheckInTimes[playerId] = now;
            });

            // 3. Write the safe, merged list back to DB
            const { error: updateError } = await supabase.from('sessions').update({
                matches: finalMatches,
                court_assignments: newAssignments,
                match_start_times: newStartTimes,
                check_in_times: finalCheckInTimes
            }).eq('id', sessionId);

            if (updateError) throw updateError;

            // 4. Update player points in profiles table (write-through)
            const change = newMatch.pointsChange || 25;
            const winners = winningTeamIndex === 1 ? team1Ids : team2Ids;
            const losers = winningTeamIndex === 1 ? team2Ids : team1Ids;

            // Fetch fresh points for all involved players to avoid race conditions
            const { data: freshProfiles } = await supabase
                .from('profiles')
                .select('id, points')
                .in('id', assignedPlayerIds);

            if (freshProfiles) {
                const pointsMap = new Map(freshProfiles.map(p => [p.id, p.points || 1000]));

                const updates = assignedPlayerIds.map(pid => {
                    const currentPts = pointsMap.get(pid) || 1000;
                    const isWinner = winners.includes(pid);
                    const newPts = isWinner ? currentPts + change : currentPts - change;
                    return {
                        id: pid,
                        points: newPts,
                        rank_frame: getFrameByPoints(newPts)
                    };
                });

                // Batch upsert all player points
                await supabase.from('profiles').upsert(updates);

                // Update local users state with new points
                setUsers(prev => prev.map(u => {
                    const update = updates.find(up => up.id === u.id);
                    if (update) return { ...u, points: update.points, rankFrame: update.rank_frame };
                    return u;
                }));
            }

            showToast("Match Recorded");

        } catch (err) {
            console.error("Failed to record match safely:", err);
            setSessions(previousSessions); // Rollback on error
            showToast("Failed to save match. Please refresh.", true);
        }
    };

    const selectedSession = sessions.find(s => s.id === selectedSessionId) || null;
    const upcomingSessions = useMemo(() => {
        const now = new Date();
        // Keep session visible until 30 minutes after scheduled end time
        return sessions.filter(s => now.getTime() <= new Date(s.endTime).getTime() + AUTO_END_GRACE_PERIOD_MS)
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    }, [sessions]);

    const paginatedSessions = upcomingSessions.slice(0, visibleCount);

    const groupedUpcomingSessions = useMemo(() => {
        const grouped: { title: string; sessions: Session[] }[] = [];
        paginatedSessions.forEach((s) => {
            const rawDate = new Date(String(s.startTime));
            const title = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(rawDate);
            let lastGroup = grouped[grouped.length - 1];
            if (!lastGroup || lastGroup.title !== title) grouped.push({ title, sessions: [s] });
            else lastGroup.sessions.push(s);
        });
        return grouped;
    }, [paginatedSessions]);

    if (isInitialLoading) {
        return (
            <div className="fixed inset-0 bg-[#000B29] flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-[#00FF41] mb-4" size={48} />
                <span className="text-gray-500 font-black uppercase tracking-widest text-[10px]">Entering Arena...</span>
            </div>
        );
    }

    // Render logic ordered to prioritize Auth screens over Error screens
    if (authStage === 'splash') return <SplashScreen onLoginClick={() => setAuthStage('login')} onRegisterClick={() => setAuthStage('register')} />;
    if (authStage === 'login') return <LoginScreen users={users} onLogin={handleLogin} onBack={() => setAuthStage('splash')} />;
    if (authStage === 'register') return <RegisterScreen onRegister={handleRegister} onBack={() => setAuthStage('splash')} />;

    if (fetchError && !sessions.length) {
        return (
            <div className="fixed inset-0 bg-[#000B29] flex flex-col items-center justify-center p-8 text-center">
                <WifiOff className="text-red-500 mb-6" size={64} />
                <h2 className="text-2xl font-black italic uppercase text-white tracking-tighter mb-4">Connection <span className="text-red-500">Failed</span></h2>
                <button onClick={() => { setIsInitialLoading(true); fetchData(); }} className="px-8 py-4 bg-[#00FF41] text-[#000B29] font-black uppercase tracking-widest text-sm -skew-x-12">
                    <span className="skew-x-12 inline-block">Retry Connection</span>
                </button>
            </div>
        );
    }

    if (!activeUser && isAuthenticated) {
        return (
            <div className="fixed inset-0 bg-[#000B29] flex flex-col items-center justify-center p-8 text-center">
                <Loader2 className="animate-spin text-[#00FF41] mb-6" size={48} />
                <h2 className="text-xl font-black italic uppercase text-white tracking-tighter mb-2">Syncing <span className="text-[#00FF41]">Profile</span></h2>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-6">Securing Arena Credentials</p>
                <button onClick={() => window.location.reload()} className="flex items-center gap-2 text-gray-400 font-bold uppercase text-[10px] tracking-widest hover:text-white transition-colors">
                    <RefreshCcw size={14} /> Force Refresh
                </button>
            </div>
        );
    }

    if (!activeUser) return null;

    const renderContent = () => {
        switch (activeTab) {
            case 'leaderboard': return <Leaderboard users={users} sessions={sessions} onPlayerClick={setViewingPlayerId} currentUser={activeUser} />;
            case 'profile':
                if (isSettingsOpen) return <SettingsScreen currentUser={activeUser} onUpdateUser={handleUpdateUser} onDeleteAccount={handleDeleteAccount} onBack={() => setIsSettingsOpen(false)} onLogout={handleLogout} />;
                return <Profile user={activeUser} sessions={sessions} allUsers={users} onOpenSettings={() => setIsSettingsOpen(true)} onSessionClick={setSelectedSessionId} onOpenTiers={() => setShowTiers(true)} onOpenInstallGuide={() => setShowInstallGuide(true)} onLogout={handleLogout} />;
            case 'sessions':
            default:
                return (
                    <div className="space-y-6 animate-fade-in-up">
                        <section className="mb-12">
                            <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-6 flex items-center gap-3">
                                <Calendar className="text-[#00FF41]" size={28} />
                                <span>Upcoming <span className="text-[#00FF41]">Sessions</span></span>
                            </h3>
                            {upcomingSessions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 bg-[#001645] border border-[#002266] rounded-2xl shadow-xl overflow-hidden relative group">
                                    <div className="absolute inset-0 bg-[#00FF41] blur-3xl opacity-5 group-hover:opacity-10 transition-opacity duration-700"></div>
                                    <div className="relative z-10 flex flex-col items-center">
                                        <div className="w-20 h-20 bg-[#000B29] border border-[#002266] rounded-full flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(0,255,65,0.15)] group-hover:scale-110 transition-transform duration-500">
                                            <Zap className="text-[#00FF41]" size={36} fill="currentColor" strokeWidth={0} />
                                        </div>
                                        <h3 className="text-xl font-black italic uppercase text-white tracking-tighter mb-2">The Arena is <span className="text-gray-600">Quiet</span></h3>
                                        <p className="text-gray-400 font-medium text-xs uppercase tracking-widest mb-8 text-center max-w-[250px] leading-relaxed">No upcoming battles scheduled. Be the one to rally the squad.</p>
                                        <button
                                            onClick={() => { triggerHaptic('medium'); setIsModalOpen(true); }}
                                            className="bg-[#00FF41] hover:bg-white text-[#000B29] px-8 py-4 rounded-none -skew-x-12 text-xs font-black uppercase tracking-widest shadow-[0_0_20px_rgba(0,255,65,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] transition-all active:scale-95 flex items-center gap-2 group/btn"
                                        >
                                            <span className="skew-x-12 flex items-center gap-2">
                                                <Plus size={16} strokeWidth={4} className="group-hover/btn:rotate-90 transition-transform" />
                                                Create Session
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {groupedUpcomingSessions.map((group) => (
                                        <div key={group.title}>
                                            <div className="flex items-center gap-4 mb-4">
                                                <div className="h-px bg-gradient-to-r from-transparent via-[#002266] to-[#002266] flex-1"></div>
                                                <span className="text-[#00FF41] font-black text-xs uppercase tracking-widest bg-[#001645]/50 px-4 py-1 rounded-full">{group.title}</span>
                                                <div className="h-px bg-gradient-to-l from-transparent via-[#002266] to-[#002266] flex-1"></div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {group.sessions.map(session => (
                                                    <SessionCard key={session.id} session={session} currentUser={activeUser} allUsers={users} onJoin={handleJoin} onLeave={handleLeave} onDelete={handleDelete} onClick={setSelectedSessionId} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                );
        }
    };

    return (
        <>
            <PullToRefresh onRefresh={fetchData}>
                <div className="min-h-screen pb-24 bg-[#000B29] text-white">
                    <InstallBanner onOpenGuide={() => setShowInstallGuide(true)} />
                    <Header currentUser={activeUser} allUsers={users} onUserChange={handleUserChange} onOpenCreate={() => { setEditingSession(null); setIsModalOpen(true); }} onLogout={handleLogout} showCreateButton={activeTab === 'sessions'} showLogoutButton={activeTab === 'profile'} onLogoClick={() => setActiveTab('sessions')} />
                    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{renderContent()}</main>
                </div>
            </PullToRefresh>

            <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] transition-all duration-300 transform ${toast?.visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'}`}>
                <div className={`backdrop-blur-md border px-6 py-3 rounded-full shadow-lg flex items-center gap-3 ${toast?.isError ? 'bg-red-500/90 border-red-500 text-white shadow-red-500/20' : 'bg-[#001645]/90 border-[#00FF41] text-white shadow-[0_0_20px_rgba(0,255,65,0.3)]'}`}>
                    {toast?.isError ? <Info className="text-white" size={20} /> : <CheckCircle className="text-[#00FF41]" size={20} />}
                    <span className="text-sm font-bold tracking-wide">{toast?.message}</span>
                </div>
            </div>

            {!isSettingsOpen && <BottomNav activeTab={activeTab} onTabChange={setActiveTab} currentUser={activeUser} />}

            <CreateSessionModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingSession(null); }}
                onCreate={handleSaveSession}
                initialData={editingSession}
            />
            {selectedSession && (
                <Suspense fallback={
                    <div className="fixed inset-0 z-[150] bg-[#000B29] flex items-center justify-center">
                        <Loader2 className="animate-spin text-[#00FF41]" size={48} />
                    </div>
                }>
                    <SessionDetailModal
                        session={selectedSession}
                        currentUser={activeUser}
                        allUsers={users}
                        onClose={() => setSelectedSessionId(null)}
                        onJoin={handleJoin}
                        onLeave={handleLeave}
                        onDelete={handleDelete}
                        onStart={handleStartSession}
                        onEnd={handleEndSession}
                        onCheckInToggle={handleCheckInToggle}
                        onSkipTurn={handleSkipTurn}
                        onCourtAssignment={handleCourtAssignment}
                        onRecordMatchResult={handleRecordMatchResult}
                        onPlayerClick={setViewingPlayerId}
                        onRefresh={fetchData}
                        onEdit={handleEditSessionTrigger}
                        onQueueMatch={handleQueueMatch}
                        onPromoteMatch={handlePromoteMatch}
                        onDeleteQueuedMatch={handleDeleteQueuedMatch}
                    />
                </Suspense>
            )}
            <PlayerProfileModal isOpen={!!viewingPlayerId} onClose={() => setViewingPlayerId(null)} userId={viewingPlayerId} allUsers={users} sessions={sessions} />
            <ArenaTiersModal isOpen={showTiers} onClose={() => setShowTiers(false)} user={activeUser} />
            <InstallGuideModal isOpen={showInstallGuide} onClose={() => setShowInstallGuide(false)} />
            <Analytics />
        </>
    );
};

export default App;
