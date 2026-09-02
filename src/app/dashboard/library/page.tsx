"use client";
import { useEffect, useState } from "react";
import { Card, Badge, EmptyState } from "@/components/ui";

type Book = { id: string; title: string; author: string | null; category: string | null; totalCopies: number; availableCopies: number };
type Issue = { id: string; bookId: string; issueDate: string; dueDate: string; status: string; studentFirstName: string | null; studentLastName: string | null };

export default function LibraryPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/library").then((r) => r.json()).then((j) => { if (j.success) { setBooks(j.data.books); setIssues(j.data.issues); } setLoading(false); });
  }, []);

  return (
    <div className="space-y-6">
      <div><h1 className="text-xl font-semibold">Library</h1><p className="text-sm text-[var(--muted)]">Book inventory and issue/return tracking</p></div>

      <Card>
        <div className="p-4 pb-0"><h3 className="font-medium">Book Inventory</h3></div>
        {loading ? <p className="p-6 text-sm text-[var(--muted)]">Loading...</p> : books.length === 0 ? <EmptyState title="No books in catalog" /> : (
          <table className="w-full text-sm mt-3">
            <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">Title</th><th>Author</th><th>Category</th><th>Available / Total</th></tr></thead>
            <tbody>
              {books.map((b) => (
                <tr key={b.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 px-4 font-medium">{b.title}</td>
                  <td>{b.author ?? "-"}</td>
                  <td>{b.category ?? "-"}</td>
                  <td><Badge tone={b.availableCopies > 0 ? "success" : "danger"}>{b.availableCopies} / {b.totalCopies}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card>
        <div className="p-4 pb-0"><h3 className="font-medium">Issued Books</h3></div>
        {issues.length === 0 ? <EmptyState title="No active issues" /> : (
          <table className="w-full text-sm mt-3">
            <thead className="text-left text-[var(--muted)] border-b border-[var(--border)]"><tr><th className="py-3 px-4">Book</th><th>Borrower</th><th>Issued</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>
              {issues.map((i) => (
                <tr key={i.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-3 px-4">{books.find((b) => b.id === i.bookId)?.title ?? "-"}</td>
                  <td>{i.studentFirstName ? `${i.studentFirstName} ${i.studentLastName}` : "-"}</td>
                  <td>{i.issueDate}</td>
                  <td>{i.dueDate}</td>
                  <td><Badge tone={i.status === "returned" ? "success" : "warning"}>{i.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
