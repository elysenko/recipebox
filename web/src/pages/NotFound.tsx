import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="card state" data-testid="notfound">
      <span className="emoji">🍳</span>
      <h1>Page not found</h1>
      <p>That page isn’t on the menu.</p>
      <Link to="/recipes" className="btn btn-primary" style={{ marginTop: 12 }}>Back to recipes</Link>
    </div>
  );
}
