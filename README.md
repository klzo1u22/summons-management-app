# Summons Management App

A modern, glassmorphic web application for managing summons, subpoenas, and witness statements.

## Features

- **Premium UI**: Dark-mode "Glassmorphism" aesthetic with smooth animations.
- **Kanban Dashboard**: Visual workflow for summons (Draft -> Issued -> Served).
- **Summons Management**: Create, Edit, and Delete summons with Zod validation.
- **Statement Tracking**: Dedicated side-sheet to log and view witness statements chronologically.
- **Responsive Design**: Built with Tailwind CSS v4 and Framer Motion.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Open Browser**:
    Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

- `app/`: Next.js App Router pages (Dashboard).
- `components/ui/`: Reusable primitives (GlassCard, Button, Modal, Sheet).
- `components/dashboard/`: Business components (SummonsCard, SummonsBoard, SummonsDetail).
- `components/forms/`: Data entry forms.
- `lib/mock-data.ts`: Mock database for development.
- `types/`: TypeScript definitions.

## Verification

To verify the "Happy Path":
1.  Click **"New Summons"**, fill the form, and Save.
2.  Click the new card to open the **Details Sheet**.
3.  Click **Edit**, scroll to change Status to "Issued", and Save.
4.  In the Details Sheet, type a new **Statement** and hit Enter.
5.  Check the **Kanban Board** to see the card moved to the new column.
