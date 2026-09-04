from __future__ import annotations

import sol_volume_alert.research_divergence as base


def expanded_grid():
    # One-step boundary expansion only: prior best sat at the old maximum
    # window=64 and hold=32, so test the immediately adjacent log-scale band.
    windows = [2, 4, 8, 16, 32, 64, 128]
    holds = [1, 2, 4, 8, 16, 32, 64]
    quantiles = [0.50, 0.60, 0.70, 0.80, 0.90, 0.95]
    modes = [1, -1]
    return [base.Candidate(w, h, q, m) for w in windows for h in holds for q in quantiles for m in modes]


if __name__ == "__main__":
    base.candidate_grid = expanded_grid
    base.main()
