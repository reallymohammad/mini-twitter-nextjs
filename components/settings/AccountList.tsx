"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, UserRound, X } from "lucide-react";

interface Account {
  id: string;
  fullName: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
}

interface AccountListProps {
  title: string;
  emptyText: string;
  removeText: string;
  listEndpoint: string;
  removeEndpoint: string;
}

export default function AccountList({
  title,
  emptyText,
  removeText,
  listEndpoint,
  removeEndpoint,
}: AccountListProps) {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAccounts() {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await fetch(listEndpoint, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load accounts");
        }

        const data = await response.json();

        const users = Array.isArray(data)
          ? data
          : Array.isArray(data?.users)
            ? data.users
            : null;

        if (!users) {
          throw new Error("Invalid accounts response");
        }

        if (!cancelled) {
          setAccounts(users);
        }
      } catch {
        if (!cancelled) {
          setLoadError("Failed to load the list.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadAccounts();

    return () => {
      cancelled = true;
    };
  }, [listEndpoint]);

  async function handleRemove(account: Account) {
    if (removingId !== null) return;

    try {
      setRemovingId(account.id);
      setRemoveError(null);

      const response = await fetch(removeEndpoint, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          targetUserId: account.id,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);

        throw new Error(
          typeof result?.error === "string"
            ? result.error
            : "The operation failed. Please try again.",
        );
      }

      setAccounts((current) =>
        current.filter((item) => item.id !== account.id),
      );
    } catch (error) {
      setRemoveError(
        error instanceof Error
          ? error.message
          : "The operation failed. Please try again.",
      );
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-4 py-6 sm:px-6">
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.push(`/${locale}/settings/privacy`)}
          aria-label="Back"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5 rtl:rotate-180" />
        </button>

        <h1 className="text-xl font-semibold">{title}</h1>
      </header>

      {removeError && (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {removeError}
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="h-6 w-6 animate-spin" />
        </div>
      ) : loadError ? (
        <p role="alert" className="py-10 text-center text-sm text-destructive">
          {loadError}
        </p>
      ) : accounts.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center gap-3 px-4 py-4"
            >
              <Link
                href={`/${locale}/profile/${account.username}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                {account.avatarUrl ? (
                  <img
                    src={account.avatarUrl}
                    alt={account.fullName}
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted">
                    <UserRound className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate font-medium">{account.fullName}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    @{account.username}
                  </p>

                  {account.bio && (
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {account.bio}
                    </p>
                  )}
                </div>
              </Link>

              <button
                type="button"
                onClick={() => handleRemove(account)}
                disabled={removingId !== null}
                className="inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removingId === account.id ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}

                <span>{removeText}</span>
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
