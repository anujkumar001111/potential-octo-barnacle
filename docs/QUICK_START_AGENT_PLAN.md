# Quick Start: Agent Plan Embedded Component

Fast reference guide for using the `AgentPlanEmbedded` component in Manus Electron.

## Installation

Already included in the project. No additional installation needed.

## Basic Usage

```typescript
import AgentPlanEmbedded from '@/components/ui/agent-plan-embedded';

const tasks = [
  {
    id: "1",
    title: "Analyze Requirements",
    description: "Review project requirements",
    status: "in-progress",
    priority: "high",
    level: 0,
    dependencies: [],
    subtasks: [],
  },
];

function MyComponent() {
  return <AgentPlanEmbedded tasks={tasks} />;
}
```

## Common Patterns

### 1. In Chat Messages

```typescript
function ChatMessage({ message }) {
  return (
    <div className="message">
      <p>{message.content}</p>
      {message.plan && (
        <AgentPlanEmbedded 
          tasks={message.plan.tasks}
          compact={true}
        />
      )}
    </div>
  );
}
```

### 2. With Status Updates

```typescript
function InteractiveTaskView() {
  const [tasks, setTasks] = useState(initialTasks);

  return (
    <AgentPlanEmbedded
      tasks={tasks}
      onTaskStatusChange={(taskId, status) => {
        // Update state
        setTasks(prev => prev.map(t => 
          t.id === taskId ? { ...t, status } : t
        ));
        // Sync to backend
        window.api.updateTaskStatus(taskId, status);
      }}
    />
  );
}
```

### 3. Real-time Updates

```typescript
function LiveTaskMonitor({ taskId }) {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    const unsubscribe = window.api.onTaskUpdate(setTasks);
    return unsubscribe;
  }, [taskId]);

  return <AgentPlanEmbedded tasks={tasks} />;
}
```

## Props Quick Reference

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tasks` | `Task[]` | ✅ | Array of tasks to display |
| `compact` | `boolean` | ❌ | Use compact spacing |
| `onTaskStatusChange` | `function` | ❌ | Task status change callback |
| `onSubtaskStatusChange` | `function` | ❌ | Subtask status change callback |

## Task Interface

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

## Status Values

- `"completed"` - ✅ Green checkmark
- `"in-progress"` - 🔵 Blue dotted circle
- `"pending"` - ⭕ Gray circle
- `"need-help"` - ⚠️ Yellow alert
- `"failed"` - ❌ Red X

## Styling Tips

### Custom Wrapper

```typescript
<div className="my-wrapper">
  <AgentPlanEmbedded tasks={tasks} />
</div>
```

```css
.my-wrapper {
  padding: 16px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
}
```

### Compact Mode

```typescript
<AgentPlanEmbedded tasks={tasks} compact={true} />
```

Use `compact={true}` for tighter spacing in sidebars and chat messages.

## Common Issues

### Tasks Not Showing
✅ Ensure `tasks` array is not empty  
✅ Check that each task has required fields  
✅ Verify task IDs are unique

### Animations Not Working
✅ Check if `prefers-reduced-motion` is enabled  
✅ Verify Framer Motion is installed: `pnpm list framer-motion`

### Type Errors
✅ Import types: `import { Task, Subtask } from '@/components/ui/agent-plan-embedded'`  
✅ Ensure all required fields are provided

## Performance Tips

### Large Task Lists (50+)
```typescript
// Use pagination
const paginatedTasks = tasks.slice(page * 20, (page + 1) * 20);
<AgentPlanEmbedded tasks={paginatedTasks} />
```

### Frequent Updates
```typescript
// Debounce status updates
const debouncedUpdate = useMemo(
  () => debounce(updateTaskStatus, 300),
  []
);
```

## Accessibility

- ✅ Full keyboard navigation (Enter/Space to expand)
- ✅ Screen reader support with ARIA labels
- ✅ Reduced motion support
- ✅ 3:1 contrast ratio for focus indicators

## Demo

Visit `/agent-plan-demo` in development mode to see live examples.

## Full Documentation

- [Component API Reference](./COMPONENT_API.md)
- [UI Components Guide](./eko-docs/core-concepts/ui-components.md)
- [Component README](../src/components/ui/README.md)

## Need Help?

1. Check the [Troubleshooting Guide](./COMPONENT_API.md#error-handling)
2. Review [Usage Examples](./COMPONENT_API.md#usage-examples)
3. Open a GitHub issue with the `component` label

---

**Last Updated**: January 9, 2025  
**Component Version**: 1.0.0
