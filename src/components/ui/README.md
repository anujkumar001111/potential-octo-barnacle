# Agent Plan Components

Interactive task planning and execution visualization components for AI agents in Manus Electron.

## Components

### 1. `agent-plan.tsx` - Full Interactive Plan View

A comprehensive, full-featured agent plan component with rich animations and interactions.

**Features:**
- Hierarchical task and subtask visualization
- Interactive status toggling (completed, in-progress, pending, need-help, failed)
- Expandable/collapsible tasks and subtasks
- MCP server tool badges
- Task dependencies display
- Smooth animations with reduced motion support
- Premium monochrome design matching Manus Electron theme

**Usage:**
```tsx
import Plan from '@/components/ui/agent-plan';

export default function MyPage() {
  return (
    <div className="h-full w-full">
      <Plan />
    </div>
  );
}
```

### 2. `agent-plan-embedded.tsx` - Compact Embeddable Version

A streamlined version designed for embedding in AI conversation messages.

**Features:**
- Compact layout optimized for chat messages
- Customizable task data via props
- Progress indicators (completed/total subtasks)
- Collapsible sections
- Event callbacks for status changes
- Lightweight animations

**Usage:**
```tsx
import AgentPlanEmbedded, { Task } from '@/components/ui/agent-plan-embedded';

const tasks: Task[] = [
  {
    id: "1",
    title: "Analyze Requirements",
    description: "Review project requirements",
    status: "in-progress",
    priority: "high",
    level: 0,
    dependencies: [],
    subtasks: [
      {
        id: "1.1",
        title: "Read documentation",
        description: "Go through all docs",
        status: "completed",
        priority: "high",
        tools: ["file-system", "browser"],
      },
    ],
  },
];

export default function ChatMessage() {
  return (
    <div>
      <p>Here's the execution plan:</p>
      <AgentPlanEmbedded 
        tasks={tasks}
        compact={true}
        onTaskStatusChange={(taskId, newStatus) => {
          console.log(`Task ${taskId} status changed to ${newStatus}`);
        }}
      />
    </div>
  );
}
```

## Type Definitions

### Task
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "pending" | "need-help" | "failed";
  priority: "high" | "medium" | "low";
  level: number;
  dependencies: string[];
  subtasks: Subtask[];
}
```

### Subtask
```typescript
interface Subtask {
  id: string;
  title: string;
  description: string;
  status: "completed" | "in-progress" | "pending" | "need-help" | "failed";
  priority: "high" | "medium" | "low";
  tools?: string[]; // MCP server tools used
}
```

## Status Icons

- ✅ **completed** - Green checkmark circle
- 🔵 **in-progress** - Blue dotted circle
- ⚠️ **need-help** - Yellow alert circle
- ❌ **failed** - Red X circle
- ⭕ **pending** - Gray empty circle

## Props

### AgentPlanEmbedded Props

```typescript
interface AgentPlanEmbeddedProps {
  tasks: Task[];                    // Array of tasks to display
  compact?: boolean;                // Use compact spacing (default: false)
  onTaskStatusChange?: (            // Callback when task status changes
    taskId: string, 
    newStatus: string
  ) => void;
  onSubtaskStatusChange?: (         // Callback when subtask status changes
    taskId: string, 
    subtaskId: string, 
    newStatus: string
  ) => void;
}
```

## Styling

Both components use inline styles with CSS-in-JS for theme consistency:
- Dark theme with monochrome palette
- Semi-transparent backgrounds: `rgba(255, 255, 255, 0.03)`
- Subtle borders: `rgba(255, 255, 255, 0.1)`
- Hover states: `rgba(255, 255, 255, 0.05)`

## Animations

### Framer Motion Integration
- Smooth expand/collapse transitions (200ms)
- Reduced motion support via `prefers-reduced-motion` media query
- AnimatePresence for enter/exit animations
- Height-based animations for collapsible sections

### Performance
- Optimized for 60fps animations
- Minimal re-renders with React state management
- Efficient DOM updates with AnimatePresence

## Accessibility

- Keyboard navigation support
- Semantic HTML structure
- ARIA-compatible status indicators
- Screen reader friendly with lucide-react icons
- Focus management for interactive elements

## Integration Examples

### In AI Sidebar Messages

```tsx
import { MessageList } from '@/components/chat/MessageComponents';
import AgentPlanEmbedded from '@/components/ui/agent-plan-embedded';

function AISidebar() {
  const messages = [
    {
      type: 'assistant',
      content: 'I\'ve created an execution plan for your task.',
      plan: {
        tasks: [/* task data */]
      }
    }
  ];

  return (
    <MessageList>
      {messages.map(msg => (
        <div key={msg.id}>
          <p>{msg.content}</p>
          {msg.plan && (
            <AgentPlanEmbedded 
              tasks={msg.plan.tasks}
              compact={true}
            />
          )}
        </div>
      ))}
    </MessageList>
  );
}
```

### In Task Detail View

```tsx
import Plan from '@/components/ui/agent-plan';

function TaskDetailPage() {
  return (
    <div className="flex h-screen flex-col">
      <header className="border-b p-4">
        <h1>Task Execution Plan</h1>
      </header>
      <main className="flex-1 overflow-auto p-4">
        <Plan />
      </main>
    </div>
  );
}
```

### With Real-time Updates

```tsx
import { useState, useEffect } from 'react';
import AgentPlanEmbedded from '@/components/ui/agent-plan-embedded';

function LiveTaskMonitor({ taskId }: { taskId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    // Subscribe to task updates via IPC
    window.api.onTaskUpdate((update) => {
      setTasks(update.tasks);
    });
  }, [taskId]);

  const handleStatusChange = (taskId: string, newStatus: string) => {
    // Sync status change back to main process
    window.api.updateTaskStatus(taskId, newStatus);
  };

  return (
    <AgentPlanEmbedded 
      tasks={tasks}
      onTaskStatusChange={handleStatusChange}
    />
  );
}
```

## Demo Page

A full demo is available at `/agent-plan-demo` route:

```tsx
// src/pages/agent-plan-demo.tsx
import Plan from '@/components/ui/agent-plan';

export default function AgentPlanDemo() {
  return (
    <div className="flex h-full w-full flex-col p-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Agent Plan Demo</h1>
        <p className="mt-2 text-sm">
          Interactive task planning and execution visualization
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <Plan />
      </div>
    </div>
  );
}
```

## Dependencies

- **React 19**: Core framework
- **Framer Motion**: Animation library
- **lucide-react**: Icon library
- **TypeScript**: Type safety

## Best Practices

1. **Data Structure**: Ensure task IDs are unique across the entire plan
2. **Status Updates**: Use callbacks to sync status changes with backend
3. **Performance**: For large plans (50+ tasks), consider pagination or virtualization
4. **Accessibility**: Test with keyboard navigation and screen readers
5. **Theming**: Components inherit from global CSS variables for consistency

## Troubleshooting

### Animations Not Working
- Check if `prefers-reduced-motion` is enabled in browser/OS
- Verify Framer Motion is properly installed: `pnpm list framer-motion`

### Icons Not Displaying
- Ensure lucide-react is installed: `pnpm add lucide-react`
- Check for CSS conflicts with icon sizing

### Type Errors
- Import types from the component: `import { Task, Subtask } from '@/components/ui/agent-plan-embedded'`
- Ensure all required fields are provided in task objects

## Future Enhancements

- [ ] Drag-and-drop task reordering
- [ ] Task filtering and search
- [ ] Export plan to JSON/Markdown
- [ ] Timeline view mode
- [ ] Gantt chart visualization
- [ ] Real-time collaboration features

```tsx
import { ConversationArea } from '@/components/ai-sidebar/ConversationArea';
import AgentPlanEmbedded from '@/components/ui/agent-plan-embedded';

// Extend message type to include plan data
interface MessageWithPlan extends Message {
  plan?: Task[];
}

// In your message renderer
{message.plan && (
  <AgentPlanEmbedded 
    tasks={message.plan}
    compact={true}
  />
)}
```

### As a Standalone Page

```tsx
// pages/agent-plan-demo.tsx
import Plan from '@/components/ui/agent-plan';

export default function AgentPlanDemo() {
  return (
    <div className="h-full w-full p-4">
      <Plan />
    </div>
  );
}
```

## Styling

Both components use:
- Tailwind CSS 4 for utility classes
- CSS custom properties from `globals.css` for theming
- Inline styles for dynamic monochrome theme colors
- Framer Motion for animations

### Theme Variables Used
- `--color-text-01-dark` - Primary text
- `--color-text-03-dark` - Secondary text
- `rgba(255, 255, 255, 0.03)` - Card backgrounds
- `rgba(255, 255, 255, 0.1)` - Borders
- `rgba(255, 255, 255, 0.05)` - Hover states

## Accessibility

- Keyboard navigation support
- Reduced motion preference detection
- ARIA labels for interactive elements
- Semantic HTML structure
- Focus indicators

## Demo Page

Visit `/agent-plan-demo` to see both components in action with interactive examples.

## Dependencies

- `lucide-react` - Icon library
- `framer-motion` - Animation library
- `react` - UI framework
- `tailwindcss` - Styling

All dependencies are already installed in the project.
