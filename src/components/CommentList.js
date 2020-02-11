import React from "react";
import Comment from "./Comment";

export default function CommentList(props) {
  return (
    <div className="commentList">
      {props.comments.length === 0 && !props.loading ? (
        <div className="alert text-center alert-info">
          Be the first to comment
        </div>
      ) : null}
      {props.comments.map !== undefined
        ? props.comments.map((comment, index) => (
            <Comment
              key={index}
              comment={comment}
              comments_app={props.comments_app}
              ref_id={comment.ref}
            />
          ))
        : {}}
    </div>
  );
}
