"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class NotificationsErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Notifications menu error:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="relative shrink-0"
                aria-label="Notifications"
              />
            }
          >
            <Bell className="size-5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[min(100vw-2rem,22rem)] p-0">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="px-3 py-2 text-sm font-medium text-foreground">
                Notifications
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="space-y-3 p-4 text-center">
                <p className="text-sm text-muted-foreground">Notifications unavailable.</p>
                <Button type="button" size="sm" variant="outline" onClick={this.handleRetry}>
                  Retry
                </Button>
              </div>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return this.props.children;
  }
}
