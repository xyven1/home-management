import subprocess
from datetime import datetime

revision = (
    subprocess.check_output(["git", "rev-parse", "HEAD"])
    .strip()
    .decode("utf-8")
)[:8]
# unix timestamp of the current moment
timestamp = datetime.utcnow().isoformat()
print("'-D COMMIT_HASH=\"%s\"' '-D COMPILATION_TIME=\"%sZ\"'" % (revision, timestamp))