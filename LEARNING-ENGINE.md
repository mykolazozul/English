# Learning Engine

The Learning Engine is the central policy layer. UI components should not invent learning rules.

Current responsibilities:
- prioritize due SRS cards
- prioritize high-error words
- prefer new words when the learner has little history
- support category filters
- produce adaptive ordering
- keep SRS state normalized
- calculate intervals/ease/lapses

Future extensions belong here: FSRS tuning, CEFR progression, grammar prerequisites, listening/speaking balance, spaced retrieval, confidence calibration and personalized lesson composition.
