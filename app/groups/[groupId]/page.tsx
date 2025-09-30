'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ListOrdered, CheckCircle, XCircle, Clock, Loader2, Users, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { ref, onValue, push, set } from 'firebase/database';
import { paths } from '@/lib/paths'; // import your paths object
import { useAuth } from '@/hooks/use-auth'; // Custom hook to get auth info
import useSWRSubscription from "swr/subscription"

// --- TYPES ---
interface Question {
  id: string;
  title: string;
  points: number;
  status: 'Completed' | 'Attempted' | 'Unattempted';
  difficulty: 'Easy' | 'Medium' | 'Hard';
  link?: string; 
}

interface GroupData {
  name: string;
  questions: Question[];
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

// --- Modal for Adding Question ---
// Assuming 'Question' is a type defined elsewhere
// Assuming 'Button' and 'variant' (like 'outline') are defined elsewhere

interface QuestionBase {
  title: string;
  points: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  link?: string; // New optional field
}

// Extend the incoming types to support the new link field and potentially existing data
interface QuestionModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (q: QuestionBase) => void;
  // Optional prop for editing existing data
  existingQuestion?: QuestionBase & { id?: string; status?: string }; // Includes fields to pre-populate
}

const DEFAULT_POINTS = 100;
const DEFAULT_DIFFICULTY: 'Easy' | 'Medium' | 'Hard' = 'Easy';

function QuestionModal({ open, onClose, onSubmit, existingQuestion }: QuestionModalProps) {
  // Determine if we are in 'edit' mode
  const existing = !!existingQuestion;

  // State initialization based on whether an existingQuestion is provided
  const [title, setTitle] = useState(existingQuestion?.title || '');
  const [points, setPoints] = useState(existingQuestion?.points || DEFAULT_POINTS);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>(existingQuestion?.difficulty || DEFAULT_DIFFICULTY);
  const [link, setLink] = useState(existingQuestion?.link || ''); // New state for Problem Link

  // Effect to reset state or load new existing data when the modal is opened
  useEffect(() => {
    if (open) {
      setTitle(existingQuestion?.title || '');
      setPoints(existingQuestion?.points || DEFAULT_POINTS);
      setDifficulty(existingQuestion?.difficulty || DEFAULT_DIFFICULTY);
      setLink(existingQuestion?.link || '');
    }
  }, [open, existingQuestion]);

  const handleSubmit = () => {
    // Basic validation
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
        
        {/* Improved layout and styling */}
        <div className="rounded-md border p-4 bg-gray-50 dark:bg-gray-800">
          <div className="mb-4 text-md font-medium text-gray-700 dark:text-gray-300">
            {existing ? "Edit Today's Question" : "Post Today's Question"}
          </div>
          
          <div className="grid gap-4 md:grid-cols-2">
            {/* Title Input */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
              <input
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-sm text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Two Sum (Easy)"
              />
            </div>
            
            {/* Problem Link Input (New) */}
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Problem Link (optional)</label>
              <input
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-sm text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://leetcode.com/problems/two-sum/"
              />
            </div>
            
            {/* Points Input (Back to a full row for better flow on smaller screens, or you can adjust md:grid-cols-3 if you have more fields) */}
            <div className='md:col-span-1'>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Points</label>
              <input
                className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-2 text-sm text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
                type="number"
                min={0}
                placeholder="Points"
                value={points}
                onChange={e => setPoints(Number(e.target.value) || 0)} // Handles non-number input gracefully
              />
            </div>

            {/* Difficulty Select */}
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

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim()} // Disable submit if title is empty
          >
            {existing ? "Save Changes" : "Add"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// The 'Omit<Question, 'id' | 'status'>' from your original prop has been generalized 
// to 'QuestionBase' to cleanly include the new 'link' field.
// export default QuestionModal; 
// (or whatever your export strategy is)

export default function QuestionIndexPage() {
  const { user } = useAuth()
  const params = useParams();
  const groupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
  const { data: group } = useSWRSubscription(groupId ? `groups/${groupId}` : null, (key, { next }) => {
    const unsub = onValue(ref(db, key), (snap) => next(null, snap.val()))
    return () => unsub()
  })

  const [groupData, setGroupData] = useState<GroupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = user && group?.adminUid === user.uid; 
  const [modalOpen, setModalOpen] = useState(false);

  // Fetch group info and questions
  useEffect(() => {
    if (!groupId) return;

    setLoading(true);

    // Fetch group name
    const groupRef = ref(db, paths.group(groupId));
    onValue(groupRef, (snapshot) => {
      const groupName = snapshot.val()?.name || `Group ${groupId}`;
      // Fetch questions
      const questionsRef = ref(db, paths.groupQuestionsCollection(groupId));
      onValue(questionsRef, (qSnap) => {
        const questionsObj = qSnap.val() || {};
        const questions: Question[] = Object.entries(questionsObj).map(([id, q]: any) => ({
          id,
          title: q.title,
          points: q.points,
          difficulty: q.difficulty,
          link: q.link,
          status: 'Unattempted', // TODO: Replace with user-specific status
        }));
        setGroupData({ name: groupName, questions });
        setLoading(false);
      }, (err) => {
        setError('Failed to load questions.');
        setLoading(false);
      });
    }, (err) => {
      setError('Failed to load group data.');
      setLoading(false);
    });

  }, [groupId]);

  // Add question handler
  const handleAddQuestion = async (q: QuestionBase) => { // NOTE: I've updated the type to QuestionBase for clarity based on your modal
  const questionsRef = ref(db, paths.groupQuestionsCollection(groupId));
  const newRef = push(questionsRef);
    await set(newRef, {
    title: q.title,
    points: q.points,
    difficulty: q.difficulty,
    link: q.link || null, 
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

      {/* Responsive Question List */}
      <Card className="shadow-xl">
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
          {isAdmin && (
            <Button variant="default" size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Question
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop/Tablet Table View */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question Title</TableHead>
                  <TableHead className="w-[150px]">Difficulty</TableHead>
                  <TableHead className="w-[100px] text-right">Points</TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                  <TableHead className="w-[80px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupData.questions.map((question) => (
                  <TableRow key={question.id} className="hover:bg-indigo-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    <TableCell className="font-semibold">
                      {question.title}
                    </TableCell>
                    <TableCell className={getDifficultyColor(question.difficulty)}>
                      {question.difficulty}
                    </TableCell>
                    <TableCell className="text-right text-gray-700 dark:text-gray-300">
                      +{question.points}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(question.status)}
                    </TableCell>
                    <TableCell>
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
          {/* Mobile Card View */}
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
                  {getStatusBadge(question.status)}
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

      {/* Admin Quick Links */}
      {isAdmin && (
        <div className="mt-8 text-center border-t pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Group Admin actions
          </p>
          <Button variant="ghost" className="text-indigo-600 hover:text-indigo-700" onClick={() => setModalOpen(true)}>
            + Add New Question
          </Button>
        </div>
      )}

      {/* Add Question Modal */}
      <QuestionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleAddQuestion}
      />
    </div>
  );
}