import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getScript } from '@/src/lib/storage';
import ScriptList from '@/src/views/ScriptList';
import Editor from '@/src/views/Editor';
import Prompter from '@/src/views/Prompter';
import RoomViewer from '@/src/views/RoomViewer';

type Route =
  | { name: 'list' }
  | { name: 'edit'; id: string }
  | { name: 'play'; id: string }
  | { name: 'room'; roomId: string };

function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] === 'edit' && parts[1]) return { name: 'edit', id: parts[1] };
  if (parts[0] === 'play' && parts[1]) return { name: 'play', id: parts[1] };
  if (parts[0] === 'room' && parts[1]) return { name: 'room', roomId: parts[1] };
  return { name: 'list' };
}

export default function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash));

  useEffect(() => {
    const onHashChange = () => setRoute(parseHash(location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = useCallback((hash: string) => {
    location.hash = hash.replace(/^#/, '');
  }, []);

  switch (route.name) {
    case 'edit':
      return <Editor key={route.id} scriptId={route.id} navigate={navigate} />;
    case 'play':
      return <PlayLocal key={route.id} scriptId={route.id} navigate={navigate} />;
    case 'room':
      return <RoomViewer key={route.roomId} roomId={route.roomId} navigate={navigate} />;
    default:
      return <ScriptList navigate={navigate} />;
  }
}

function PlayLocal({ scriptId, navigate }: { scriptId: string; navigate: (hash: string) => void }) {
  const script = getScript(scriptId);
  if (!script) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-white/50">文稿不存在或已删除</p>
        <Button
          variant="outline"
          className="border-white/15 bg-white/5 text-white/70 hover:bg-white/10"
          onClick={() => navigate('#/')}
        >
          返回列表
        </Button>
      </div>
    );
  }
  return <Prompter title={script.title} content={script.content} onExit={() => navigate(`#/edit/${script.id}`)} />;
}
