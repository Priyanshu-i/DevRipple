'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ListOrdered, CheckCircle, XCircle, Clock, Loader2, Users, Plus, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { auth, db } from '@/lib/firebase';
import { getDatabase, ref, onValue, push, set, get } from 'firebase/database';
// Removed Firestore imports: import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { paths } from '@/lib/paths';
import { useAuth } from '@/hooks/use-auth';
import useSWRSubscription from "swr/subscription"

// --- TYPES ---
interface Question {
  id: string;
  title: string;
  points: number;
  status: 'Completed' | 'Attempted' | 'Unattempted';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  link?: string; 
  createdAt?: number;
  expiresAt?: number;
}

interface GroupData {
  name: string;
  questions: Question[];
}

// Updated structure for RTDB. Question stats will be stored under the question ID in RTDB.
interface QuestionStats {
  questionId: string;
  title: string;
  totalSubmissions: number;
  isExpired: boolean;
}

interface QuestionStatRTDB {
    title: string;
    totalSubmissions: number;
    isExpired: boolean;
    // Add other relevant question data if needed from RTDB
}

// Updated structure for RTDB. Submission stats are nested.
interface MemberQuestionStatsRTDB {
    submissionCount: number;
    solutionIds: string[];
}

interface LeaderboardEntry {
  uid: string;
  name: string;
  totalSubmissions: number;
  questionStats: {
    [questionId: string]: MemberQuestionStatsRTDB; // Use RTDB type
  };
}

interface LeaderboardData {
  members: LeaderboardEntry[];
  questions: QuestionStats[];
}

interface QuestionBase {
  title: string;
  points: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  link?: string;
}

interface QuestionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (q: QuestionBase) => void;
  existingQuestion?: QuestionBase & { id?: string; status?: string };
}

const getStatusBadge = (status: Question['status']) => {
  switch (status) {
    case 'Completed':
      return <Badge className="bg-green-500 hover:bg-green-600 text-white font-semibold">
        <CheckCircle className="w-3 h-3 mr-1" /> Completed
      </Badge>;
    case 'Attempted':
      return <Badge variant="secondary" className="border-yellow-500 text-yellow-700 dark:border-yellow-400 dark:text-yellow-300">
        <Clock className="w-3 h-3 mr-1" /> Attempted
      </Badge>;
    case 'Unattempted':
    default:
      return <Badge variant="outline" className="text-muted-foreground">
        <XCircle className="w-3 h-3 mr-1" /> Unattempted
      </Badge>;
  }
};

const getDifficultyColor = (difficulty: Question['difficulty']) => {
  switch (difficulty) {
    case 'Easy':
      return 'text-green-500 font-medium';
    case 'Medium':
      return 'text-yellow-500 font-medium';
    case 'Hard':
      return 'text-red-500 font-medium';
    default:
      return 'text-gray-500';
  }
};

const DEFAULT_POINTS = 100;
const DEFAULT_DIFFICULTY: 'Easy' | 'Medium' | 'Hard' = 'Easy';

function QuestionModal({ open, onClose, onSubmit, existingQuestion }: QuestionModalProps) {
  const existing = !!existingQuestion;
  const [title, setTitle] = useState(existingQuestion?.title || '');
  const [points, setPoints] = useState(existingQuestion?.points || DEFAULT_POINTS);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>(existingQuestion?.difficulty || DEFAULT_DIFFICULTY);
  const [link, setLink] = useState(existingQuestion?.link || '');

  useEffect(() => {
    if (open) {
      setTitle(existingQuestion?.title || '');
      setPoints(existingQuestion?.points || DEFAULT_POINTS);
      setDifficulty(existingQuestion?.difficulty || DEFAULT_DIFFICULTY);
      setLink(existingQuestion?.link || '');
    }
  }, [open, existingQuestion]);

  const handleSubmit = () => {
    if (title.trim()) {
      onSubmit({ title, points, difficulty, link: link.trim() || undefined });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-lg shadow-xl transform transition-all">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
          {existing ? "Edit Question" : "Add New Question"}
        </h2>
        
        <div className="rounded-md border p-4 bg-gray-50 dark:bg-gray-800">
          <div className="mb-4 text-md font-medium text-gray-700 dark:text-gray-300">
            {existing ? "Edit Today's Question" : "Post Today's Question"}
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
              <input
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-sm text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Two Sum (Easy)"
              />
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Problem Link (optional)</label>
              <input
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-sm text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://leetcode.com/problems/two-sum/"
              />
            </div>
            
            <div className='md:col-span-1'>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Points</label>
              <input
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-sm text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
                type="number"
                min={0}
                placeholder="Points"
                value={points}
                onChange={e => setPoints(Number(e.target.value) || 0)}
              />
            </div>

            <div className='md:col-span-1'>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty</label>
              <select
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-sm text-gray-900 dark:text-white appearance-none focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={difficulty}
                onChange={e => setDifficulty(e.target.value as 'Easy' | 'Medium' | 'Hard')}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim()}
          >
            {existing ? "Save Changes" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Leaderboard Component
function Leaderboard({ data }: { data: LeaderboardData; groupId: string }) {
  const { members } = data;

  // Sort members by total submissions (or alphabetically if totalSubmissions missing)
  const sortedMembers = [...members].sort(
    (a, b) => (b.totalSubmissions ?? 0) - (a.totalSubmissions ?? 0)
  );

  if (sortedMembers.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No submissions yet in this group.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300 dark:border-gray-700">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800">
            <th className="border border-gray-300 dark:border-gray-700 px-4 py-2 text-left font-semibold sticky left-0 bg-gray-100 dark:bg-gray-800 z-10">
              Name (Contact)
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedMembers.map((member, idx) => (
            <tr
              key={member.uid}
              className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
              <td className="border border-gray-300 dark:border-gray-700 px-4 py-2 sticky left-0 bg-white dark:bg-gray-900 z-10">
                <div className="flex items-center gap-2">
                  {idx < 3 && (
                    <span
                      className={`text-lg ${
                        idx === 0
                          ? "text-yellow-500"
                          : idx === 1
                          ? "text-gray-400"
                          : "text-orange-600"
                      }`}
                    >
                      {/* {idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"} */}
                    </span>
                  )}
                  <Link
                    href={`/contact/${member.uid}`}
                    className="text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {member.name}
                  </Link>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


export default function QuestionIndexPage() {
  const { user } = useAuth()
  const params = useParams();
  const groupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
  
  // Use SWRSubscription for group data from RTDB
  const { data: group } = useSWRSubscription(groupId ? paths.group(groupId) : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val()))
    return () => unsub()
  })

  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [secondaryAdmins, setSecondaryAdmins] = useState<Record<string, boolean>>({})
  const [isAdmin, setIsAdmin] = useState(false)
  const [isSecondaryAdmin, setIsSecondaryAdmin] = useState(false)
  const [canManage, setCanManage] = useState(false)
  const [modalOpen, setModalOpen] = useState(false);

  // Listen to secondary admins
  useEffect(() => {
    // This is already using RTDB, so it's fine
    const unsub = onValue(ref(db, paths.groupSecondaryAdmins(groupId)), 
      (snap) => setSecondaryAdmins(snap.val() || {})
    )
    return () => unsub()
  }, [groupId])

  // Set permissions
  useEffect(() => {
    const uid = auth.currentUser?.uid
    setIsAdmin(group?.adminUid === uid)
    setIsSecondaryAdmin(!!secondaryAdmins[uid || ""])
    setCanManage(group?.adminUid === uid || !!secondaryAdmins[uid || ""])
  }, [group, secondaryAdmins])

  // Fetch group info and questions
  useEffect(() => {
    if (!groupId) return;

    setLoading(true);

    const groupRef = ref(db, paths.group(groupId));
    
    // Use onValue for group data (name)
    const unsubGroup = onValue(groupRef, (snapshot) => {
      const groupName = snapshot.val()?.name || `Group ${groupId}`;
      const questionsRef = ref(db, paths.groupQuestionsCollection(groupId));

      // Nested onValue for questions data
      const unsubQuestions = onValue(questionsRef, (qSnap) => {
        const questionsObj = qSnap.val() || {};
        const now = Date.now();
        const questions: Question[] = Object.entries(questionsObj)
          .map(([id, q]: any) => ({
            id,
            title: q.title,
            points: q.points,
            difficulty: q.difficulty,
            link: q.link,
            createdAt: q.createdAt ?? 0,
            expiresAt: q.expiresAt ?? null,
            // NOTE: The status 'Completed'/'Attempted' requires checking user submissions, 
            // which is omitted here as we're focusing on the structure. 
            // A separate RTDB listener would be needed for the current user's submission status.
            status: 'Unattempted' as Question['status'], 
          }))
          .filter((q) => !q.expiresAt || q.expiresAt > now)
          .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        setGroupData({ name: groupName, questions });
        setLoading(false);
      }, (err) => {
        setError('Failed to load questions.');
        setLoading(false);
      });
      
      // Cleanup for nested listener
      return () => unsubQuestions();
      
    }, (err) => {
      setError('Failed to load group data.');
      setLoading(false);
    });
    
    // Cleanup for main listener
    return () => unsubGroup();

  }, [groupId]);

  // Fetch leaderboard data using Realtime DB exclusively
  useEffect(() => {
    if (!groupId) return;

    setLoadingLeaderboard(true);

    // Leaderboard is now built from three main RTDB paths:
    // 1. Question Stats
    // 2. Group Members
    // 3. Member Stats (total & per-question)

    const questionStatsRef = ref(db, paths.questionStatsCollection(groupId));
    
    const unsubQuestionStats = onValue(questionStatsRef, async (qStatsSnap) => {
        const questionStatsObj: Record<string, QuestionStatRTDB> = qStatsSnap.val() || {};
        const questions: QuestionStats[] = Object.entries(questionStatsObj).map(([id, data]) => ({
            questionId: id,
            title: data.title || 'Untitled Question',
            totalSubmissions: data.totalSubmissions || 0,
            isExpired: data.isExpired || false,
        }));
        
        // Fetch group members from Realtime DB
        const membersRef = ref(db, paths.groupMembers(groupId));
        
        const unsubMembers = onValue(membersRef, async (membersSnap) => {
            const membersObj = membersSnap.val() || {};
            const memberUids = Object.keys(membersObj);

            // Fetch all member-specific data concurrently
            const members: LeaderboardEntry[] = await Promise.all(
        memberUids.map(async (uid) => {
        // Get user public info
        const userPublicSnap = await get(ref(db, paths.userPublic(uid)));
        const userPublicData = userPublicSnap.val();
        
        // Since userPublic is now initialized on sign-in, prioritize displayName, then username
        const name = userPublicData?.displayName || userPublicData?.username || 'User';
        
        // Get member total stats
        const memberStatsSnap = await get(ref(db, paths.groupMemberStats(groupId, uid)));
        const memberStats = memberStatsSnap.val();
        const totalSubmissions = memberStats?.totalSubmissions || 0;
        
        // Get per-question stats for this user
        const questionStats: LeaderboardEntry['questionStats'] = {};
        
        await Promise.all(
            questions.map(async (question) => {
                const userQStatsPath = paths.userQuestionStats(groupId, question.questionId, uid);
                const userQStatsSnap = await get(ref(db, userQStatsPath));
                const data: MemberQuestionStatsRTDB | null = userQStatsSnap.val();

                if (data) {
                    questionStats[question.questionId] = {
                        submissionCount: data.submissionCount || 0,
                        solutionIds: data.solutionIds || [],
                    };
                }
            })
        );

        return {
            uid,
            name,
            totalSubmissions,
            questionStats,
        };
    })
);

            const activeMembers = members.filter(m => m.totalSubmissions > 0);

            setLeaderboardData({
                members: activeMembers,
                questions,
            });
            setLoadingLeaderboard(false);
        }, (err) => {
            console.error('Error fetching group members:', err);
            setLoadingLeaderboard(false);
        });
        
        return () => unsubMembers();
        
    }, (err) => {
        console.error('Error fetching question stats:', err);
        setLoadingLeaderboard(false);
    });

    return () => unsubQuestionStats();

  }, [groupId]);

  const handleAddQuestion = async (q: QuestionBase) => {
    const questionsRef = ref(db, paths.groupQuestionsCollection(groupId));
    const newRef = push(questionsRef);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // Set question data in the ephemeral location
    await set(newRef, {
      id: newRef.key,
      title: q.title,
      points: q.points,
      difficulty: q.difficulty,
      link: q.link || null,
      createdAt: now,
      expiresAt: now + oneDayMs,
    });
    
    // Also update the persistent question stats location
    await set(ref(db, paths.questionStats(groupId, newRef.key as string)), {
        title: q.title,
        totalSubmissions: 0,
        isExpired: false, // Initially active
        createdAt: now,
        // The expiration will be managed by a server function based on the ephemeral node
    });

    setModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[60vh] flex-col space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        <p className="text-lg text-muted-foreground">Loading group questions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="bg-red-50 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-700">Error Loading Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!groupData) {
    return <div className="text-center p-8 text-muted-foreground">No group data available.</div>;
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-50 flex items-center">
            <Users className="w-7 h-7 mr-3 text-indigo-500" />
            {groupData.name} Challenges
          </h1>
          <p className="text-lg text-muted-foreground mt-1">
            Dive into the group's list of coding questions and start solving.
          </p>
        </div>
        <Link href={`/groups/${groupId}/info`}>
          <Button variant="outline" className="shadow-md transition-all hover:shadow-lg">
            Group Info
          </Button>
        </Link>
      </div>

      {/* Questions Section */}
      <Card className="shadow-xl mb-8">
        <CardHeader className="border-b flex justify-between items-center">
          <div>
            <CardTitle className="text-xl flex items-center">
              <ListOrdered className="w-5 h-5 mr-2" />
              Available Questions
            </CardTitle>
            <CardDescription>
              Click on a question to view details and submit your solution.
            </CardDescription>
          </div>
          {canManage && (
            <Button variant="default" size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Question
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden sm:block">
            <Table className="border-separate border-spacing-x-6 w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4 py-2 text-left">Question Title</TableHead>
                  <TableHead className="w-[150px] px-4 py-2 text-left">Difficulty</TableHead>
                  <TableHead className="w-[100px] px-4 py-2 text-right">Points</TableHead>
                  <TableHead className="w-[80px] px-4 py-2 text-center">Action</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {groupData.questions.map((question) => (
                  <TableRow
                    key={question.id}
                    className="hover:bg-indigo-50/50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <TableCell className="font-semibold px-4 py-2 text-left">
                      {question.title}
                    </TableCell>
                    <TableCell
                      className={`${getDifficultyColor(question.difficulty)} px-4 py-2 text-left`}
                    >
                      {question.difficulty}
                    </TableCell>
                    <TableCell className="text-right text-gray-700 dark:text-gray-300 px-4 py-2">
                      +{question.points}
                    </TableCell>
                    <TableCell className="px-4 py-2 text-center">
                      <Link href={`/groups/${groupId}/${question.id}`} passHref>
                        <Button size="sm" variant="default">
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="sm:hidden p-4 space-y-4">
            {groupData.questions.map((question) => (
              <Card key={question.id} className="p-4 shadow-sm border-l-4 border-indigo-400">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200">{question.title}</h3>
                  <div className={`text-sm ${getDifficultyColor(question.difficulty)}`}>
                    {question.difficulty}
                  </div>
                </div>
                <div className="flex justify-between items-center mb-3 text-sm text-muted-foreground">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Points: +{question.points}</span>
                  </div>
                </div>
                <Link href={`/groups/${groupId}/${question.id}`} passHref>
                  <Button size="sm" className="w-full">
                    View Challenge
                  </Button>
                </Link>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Section */}
      <Card className="shadow-xl">
        <CardHeader className="border-b">
          <CardTitle className="text-xl flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-yellow-500" />
            Group Metrics
          </CardTitle>
          <CardDescription>
            Track member submissions and participation across all questions.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {loadingLeaderboard ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span className="ml-2 text-muted-foreground">Loading leaderboard...</span>
            </div>
          ) : leaderboardData ? (
            <Leaderboard data={leaderboardData} groupId={groupId} />
          ) : (
            <div className="text-center py-8 text-gray-500">
              No leaderboard data available.
            </div>
          )}
        </CardContent>
      </Card>

      {canManage && (
        <div className="mt-8 text-center border-t pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Group Admin actions
          </p>
          <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700" onClick={() => setModalOpen(true)}>
            + Add New Question
          </Button>
        </div>
      )}

      <QuestionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddQuestion}
      />
    </div>
  );
}