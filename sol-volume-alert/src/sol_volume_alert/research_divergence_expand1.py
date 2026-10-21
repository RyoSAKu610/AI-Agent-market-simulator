from __future__ import annotations

import sol_volume_alert.research_divergence as base


def expanded_grid():
    # Evidence-driven boundary expansion: after adding window=128/hold=64,
    # the best development point moved inside the window range (window=64)
    # but remained at the maximum hold=64. Keep the window boundary fixed and
    # extend only the still-binding hold dimension by one adjacent log step.
    windows = [2, 4, 8, 16, 32, 64, 128]
    holds = [1, 2, 4, 8, 16, 32, 64, 128]
    quantiles = [0.50, 0.60, 0.70, 0.80, 0.90, 0.95]
    modes = [1, -1]
    return [base.Candidate(w, h, q, m) for w in windows for h in holds for q in quantiles for m in modes]


if __name__ == "__main__":
    base.candidate_grid = expanded_grid
    base.main()
